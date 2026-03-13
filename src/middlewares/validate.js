const { ZodError } = require('zod');
const { AppError } = require('./errorHandler');

const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        try {
            req[source] = schema.parse(req[source]);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                return next(
                    new AppError(
                        "Dữ liệu đầu vào không hợp lệ",
                        400,
                        "VALIDATION_ERROR"
                    )
                );
            }
            next(err);
        }
    };
};

module.exports = validate;