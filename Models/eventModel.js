const mongoose = require("mongoose");
const TxQuery = require("../txQuery");

const structure = {
  title: String,

  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
};

const schema = new mongoose.Schema(structure);
const model = mongoose.model("Event", schema);
TxQuery.model("Event", model, structure);

module.exports = model;
