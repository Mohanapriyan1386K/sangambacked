function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
async function paged(model, filter, query, options = {}) {
  const { page, limit, skip } = pagination(query);
  const [items, total] = await Promise.all([
    model.find(filter).sort(options.sort || { createdAt: -1 }).skip(skip).limit(limit).select(options.select || '').lean(),
    model.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
module.exports = { pagination, paged };
