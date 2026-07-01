const createHttpError = require("http-errors");

const validate = (schema, source = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || source}: ${issue.message}`)
      .join("; ");
    return next(createHttpError(400, message));
  }
  req[source] = result.data;
  next();
};

module.exports = { validate };
