const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema(
  {
    _id:           { type: String },
    propertyId:    { type: String, required: true },
    inspectorId:   { type: String, required: true },
    requestedById: { type: String, required: true },
    scheduledAt:   { type: String, required: true },
    status:        { type: String, default: 'SCHEDULED', enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
    notes:         { type: String, default: null },
    report:        { type: String, default: null },
  },
  { timestamps: true }
);

const Inspection = mongoose.model('Inspection', inspectionSchema);

function toDoc(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: _id, ...rest };
}

async function getAll() {
  return Inspection.find().lean().then(docs => docs.map(toDoc));
}

async function getById(id) {
  return Inspection.findById(id).lean().then(toDoc);
}

async function create(data) {
  const doc = await Inspection.create({ _id: data.id, ...data });
  return toDoc(doc.toObject());
}

async function update(id, updates) {
  return Inspection.findByIdAndUpdate(id, updates, { new: true }).lean().then(toDoc);
}

async function remove(id) {
  await Inspection.findByIdAndDelete(id);
}

module.exports = { getAll, getById, create, update, remove };
