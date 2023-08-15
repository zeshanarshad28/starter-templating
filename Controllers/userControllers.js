const multer = require("multer");
const sharp = require("sharp");
const TxDeleter = require("../txDeleter");
const User = require("../Models/userModel");

const RefreshToken = require("../Models/refreshTokenModel");
const Email = require("../Utils/email");
const catchAsync = require("./../Utils/catchAsync");
const AppError = require("./../Utils/appError");
const factory = require("./handlersFactory");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};
exports.beABuddy = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      age: req.body.age,
      gender: req.body.gender,
      occupation: req.body.occupation,
      language: req.body.language,
      location: req.body.location,
      description: req.body.description,
      image: req.body.image,
      specialSkills: req.body.specialSkills,
      aloneBuddy: true,
    },
    {
      new: true,
      runValidators: false,
    }
  );

  res.status(200).json({
    status: 200,
    success: true,
    data: {
      user: updatedUser,
    },
  });
});
exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email");
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 200,
    success: true,
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 204,
    success: true,
    data: null,
  });
});

exports.topScorers = catchAsync(async (req, res, next) => {
  const users = await User.find({}).sort({ score: -1 });
  res.status(200).json({
    status: 200,
    success: true,
    message: "",
    data: { users },
  });
});

exports.updateProfile = catchAsync(async (req, res) => {
  const body = JSON.parse(JSON.stringify(req.body));
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { $set: { ...body } },
    { new: true }
  );

  res.status(200).json({
    status: 200,
    message: "Profile Updated Successfully",
    success: true,
    data: { user },
  });
});

exports.deleteAccount = catchAsync(async (req, res) => {
  await RefreshToken.remove({ user: req.user._id });
  return res.json({
    success: true,
    status: 200,
    message: "User Deleted Successfully!",
    data: {},
  });
});

exports.contactAdmin = catchAsync(async (req, res) => {
  const user = await User.findOne({ _id: req.user._id });
  await new Email({ email: "ameer.shah@txdynamics.io" }).sendToDoctor();
  res.status(200).json({
    status: 200,
    message: "Booked Coach Successfully",
    success: true,
    data: { user },
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
