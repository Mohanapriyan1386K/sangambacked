const Member = require('../models/Member');
const Sequence = require('../models/Sequence');
const MonthlyDue = require('../models/MonthlyDue');
const ApiError = require('../utils/ApiError');
const { paged } = require('../utils/pagination');
const { currentMonth, parseMonth } = require('../utils/date');
const audit = require('../utils/audit');

async function nextMemberCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let sequence;
    try {
      sequence = await Sequence.findOneAndUpdate(
        { _id: 'memberCode' },
        { $inc: { value: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      // Concurrent first requests may race to create the sequence document.
      if (error.code === 11000) {
        sequence = await Sequence.findOneAndUpdate({ _id: 'memberCode' }, { $inc: { value: 1 } }, { new: true });
      } else throw error;
    }
    const memberCode = `SAN-MEM-${String(sequence.value).padStart(2, '0')}`;
    if (!await Member.exists({ memberCode })) return memberCode;
  }
  throw new ApiError(500, 'Could not generate a unique member code');
}

async function createMember(data, actor, req, { preserveMemberCode = false } = {}) {
  data.firstDueMonth = data.firstDueMonth || currentMonth();
  let member;
  if (preserveMemberCode && data.memberCode) member = await Member.create(data);
  else {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        member = await Member.create({ ...data, memberCode: await nextMemberCode() });
        break;
      } catch (error) {
        if (error.code !== 11000 || attempt === 4) throw error;
      }
    }
  }
  await audit(actor._id, 'members.create', 'member', member._id, { memberCode: member.memberCode }, req);
  return member;
}
async function batchCreate(rows, actor, req) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 500) throw new ApiError(400, 'members must contain between 1 and 500 rows');
  const results = await Promise.all(rows.map(async (row, index) => {
    try { return { index, member: await createMember(row, actor, req, { preserveMemberCode: true }) }; }
    catch (error) { return { index, memberCode: row?.memberCode, error: error.message }; }
  }));
  return { created: results.filter((r) => r.member), failed: results.filter((r) => r.error) };
}
async function listMembers(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) filter.$or = ['name', 'memberCode', 'phone'].map((field) => ({ [field]: { $regex: String(query.search).slice(0, 80), $options: 'i' } }));
  return paged(Member, filter, query);
}
async function updateMember(id, data, actor, req) {
  if (data.status === 'inactive' && data.stopDueMonth === undefined) data.stopDueMonth = currentMonth();
  const member = await Member.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  if (!member) throw new ApiError(404, 'Member not found');
  await audit(actor._id, 'members.update', 'member', id, { fields: Object.keys(data) }, req);
  return member;
}
async function generateDues(month, actor, req) {
  parseMonth(month);
  const members = await Member.find({ firstDueMonth: { $lte: month }, $and: [
    { $or: [{ status: 'active' }, { status: 'inactive', stopDueMonth: { $gte: month } }] },
    { $or: [{ stopDueMonth: null }, { stopDueMonth: { $gte: month } }] },
  ] }).lean();
  const operations = members.map((member) => ({ updateOne: { filter: { memberId: member._id, dueMonth: month }, update: { $setOnInsert: { memberId: member._id, dueMonth: month, dueAmount: member.monthlyFee } }, upsert: true } }));
  if (operations.length) await MonthlyDue.bulkWrite(operations, { ordered: false });
  await audit(actor._id, 'dues.generate', 'monthlyDue', null, { month, count: members.length }, req);
  return { month, eligible: members.length, createdOrExisting: operations.length };
}
module.exports = { createMember, batchCreate, listMembers, updateMember, generateDues };
