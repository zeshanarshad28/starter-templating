const Event = require("../Models/eventModel.js");
const TxDeleter = require("../txDeleter");
const {
  Query,
  QueryModel,
  QueryBuilder,

  Matcher,
  Eq,

  PostProcessor
} = require("../Utils/query");
const catchAsync = require("../Utils/catchAsync");

exports.find = catchAsync(async (req, res, next) => {
  const event = await Event.find({})

  res.status(200).json({
    status: 200,
    success: true,
    message: 'Event Created Successfully',
    data: {event},
  });
});

exports.index = catchAsync(async (req, res, next) => {
  const event = await Event.find(JSON.parse(decodeURIComponent(req.query.query)))

  res.status(200).json({
    status: 200,
    success: true,
    message: 'Event Created Successfully',
    data: {event},
  });
});

exports.store = catchAsync(async (req, res, next) => {
  const event = await Event.create({...JSON.parse(JSON.stringify(req.body)), user: req.user._id});

  res.status(200).json({
    status: 200,
    success: true,
    message: 'Event Created Successfully',
    data: {event},
  });
});

exports.update = catchAsync(async (req, res, next) => {
    const event = await Event.findByIdAndUpdate(req.params.id, {$set: JSON.parse(JSON.stringify(req.body))}, { new: true });
  
    res.status(200).json({
      status: 200,
      success: true,
      message: 'Event Edited',
      data: {event},
    });
});

exports.delete = catchAsync(async (req, res, next) => {
    const event = await TxDeleter.deleteOne("Event", req.params.id)

    res.status(200).json({
      status: 200,
      success: true,
      message: 'Event Deleted',
      data: {event},
    });
});
