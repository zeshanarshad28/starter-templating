const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const TxQuery = require("../txQuery");

const schema = {
  name: {
    type: String,
    required: [true, "Please enter name"],
    trim: true,
  },
  bankName: {
    type: String,

    trim: true,
  },
  accountNumber: {
    type: String,

    trim: true,
  },
  accountId: String,

  email: {
    type: String,
    unique: true,
    required: [true, "must enter email"],
    //   lowercase: true,
    validate: [validator.isEmail, "please provide a valid email"],
  },
  image: {
    type: String,
    default:
      "https://divet-bucket.s3.us-east-2.amazonaws.com/png-clipart-united-states-avatar-organization-information-user-avatar-service-computer-wallpaper.png",
  },

  otpAt: Number,
  gender: {
    type: String,
  },

  password: {
    type: String,
    required: [true, "must enter password"],
    minlength: 6,
    select: false,
  },

  passwordChangedAt: Date,
  passwordResetToken: Number,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  location: {
    // Geo JSON Object
    type: {
      type: String,
      default: "point",
    },
    coordinates: [Number],
    address: String,
    description: String,
  },
  blocked: {
    type: Boolean,
    default: false,
    select: false,
  },
  role: {
    type: String,
    enum: {
      values: ["admin", "user", "buddy"],
      message: "Enter valid role ",
    },
    default: "user",
  },
  otp: {
    type: Number,
  },
  deviceToken: String,
  verified: {
    type: Boolean,
    default: true,
  },

  hasCardInfo: { type: Boolean, default: false },
  subscribed: { type: Boolean, default: false },
  subscriptionId: { type: String, default: "" },
  subscriptionType: { type: String, default: "not-subscribed" },
  customerId: { type: String, default: "" },

  createdAt: Number,
};

const userSchema = new mongoose.Schema(schema, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

userSchema.pre("save", async function (next) {
  //only run this function if password id actually modified
  if (!this.isModified("password")) return next();
  // Hash the password with cost
  this.password = await bcrypt.hash(this.password, 12);
  // remove(stop) the confirmPassword to store in db. require means necessary to input not to save in db.
  this.confirmPassword = undefined;
  next();
});
// password Tester
userSchema.methods.correctPassword = async function (
  passwordByUser,
  passwordInDb
) {
  return await bcrypt.compare(passwordByUser, passwordInDb);
};

// ========method to protect routes verifies all about token

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// update "passwordChangedAt value in DB whenever we update password "
userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000; //here -1000 mili seconds is to make sure that it will not creat any problem in login as some times that gets this
  next();
});

// Middleware to only get active=true users
userSchema.pre(/^find/, function (next) {
  // here "this" points to the current property`
  this.find({ active: true });
  next();
});

const User = mongoose.model("User", userSchema);
TxQuery.model("User", User, schema);

const subDay = (date, i) => {
  const d = date;
  d.setDate(d.getDate() - i);
  return date;
};

const last = (arr) => arr[arr.length - 1];

TxQuery.Resolver.register("User", "streak", async (user, context) => {
  console.log("USER SUBMISSIONS =>>>>>", user._id);
  const submissions = await context.fetcher.find(
    "Submission",
    {
      user: { __matcher: "eq", data: user._id },
      breath: { __matcher: "eq", data: true },
    },
    ["_id", "date"]
  );

  const consecutives = [[]];
  const dates = submissions.map((submission) => submission.date);
  for (const el of dates) {
    if (last(consecutives).length == 0)
      consecutives[consecutives.length - 1].push(el);
    else if (
      last(last(consecutives)) ==
      subDay(new Date(el), 1).toISOString().split("T")[0]
    )
      consecutives[consecutives.length - 1].push(el);
    else consecutives.push([el]);
  }

  const lastConsecutiveStreak = last(consecutives);
  console.log("UMM... RESULT >>", lastConsecutiveStreak);
  return TxQuery.Resolver.Raw(
    lastConsecutiveStreak.length < 2 ? 0 : lastConsecutiveStreak.length
  );
});

module.exports = User;
