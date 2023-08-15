const AppError = require("./../Utils/appError");

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};
const a = 1;
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  console.log(value);

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join(". ")}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = () =>
  new AppError("Your token has expired! Please log in again.", 401);

const sendErrorDev = (err, res) => {
  // console.log("in dev error");
  console.log(err);
  res.status(err.statusCode).json({
    status: err.statusCode,
    message: err.message,
    success: false,
    stack: err.stack,
    data: {},
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error("ERROR:", err);

    // 2) Send generic message
    res.status(500).json({
      status: "error",
      message: "Something went very wrong!",
    });
  }
};

module.exports = (err, req, res, next) => {
  // console.log(err.stack);
  // console.log("error called");
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  console.log("ccc");
  // if (process.env.NODE_ENV === "development") {
  console.log("Dev error");
  sendErrorDev(err, res);
  // } else if (process.env.NODE_ENV === "production") {
  //   let error = { ...err };

  //   if (error.name === "CastError") error = handleCastErrorDB(error);
  //   if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  //   if (error.name === "ValidationError")
  //     error = handleValidationErrorDB(error);
  //   if (error.name === "JsonWebTokenError") error = handleJWTError();
  //   if (error.name === "TokenExpiredError") error = handleJWTExpiredError();

  //   sendErrorProd(error, res);
  // }
};
