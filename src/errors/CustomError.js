class CustomError extends Error {
  constructor (message, httpCode, code) {
    super(message);

    this.code = code;
    this.httpCode = httpCode;
  }
}

module.exports = {
  CustomError
};
