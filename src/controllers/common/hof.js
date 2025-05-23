const { CustomError } = require('../../errors/CustomError');

/**
 * @param callbackFunction
 * @return {(function(ctx, ...[*]): Promise<void>)|*}
 */
function catchError (callbackFunction) {
  return async function (ctx, ...args) {
    try {
      await callbackFunction(ctx, ...args);
    } catch (e) {
      let httpCode = 400;

      if (e instanceof CustomError) {
        httpCode = e.httpCode;
      }

      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'stage') {
        console.log(JSON.stringify(e, null, 2));
      }

      ctx.bad(httpCode, e, { code: e.code ?? 0 });
    }
  };
}

module.exports = {
  catchError
};
