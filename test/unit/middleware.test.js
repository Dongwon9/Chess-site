import { describe, it, expect } from '@jest/globals';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { config } from '../../src/config/env.js';
config.logLevel = 'silent';
describe('Middleware', () => {
  describe('errorHandler', () => {
    it('에러를 로깅하고 500 응답을 반환해야 함', () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';

      const req = {
        method: 'POST',
        originalUrl: '/test',
      };

      let statusCode;
      let jsonData;
      const res = {
        headersSent: false,
        status: function (code) {
          statusCode = code;
          return this;
        },
        json: function (data) {
          jsonData = data;
        },
      };

      errorHandler(error, req, res, () => {});

      expect(statusCode).toBe(500);
      expect(jsonData).toEqual({
        message: 'Internal Server Error',
      });
    });

    it('헤더가 이미 전송된 경우 next를 호출해야 함', () => {
      const error = new Error('Test error');

      const req = { method: 'GET', originalUrl: '/test' };
      const res = {
        headersSent: true,
      };

      let nextCalled = false;
      let passedError;
      const next = (err) => {
        nextCalled = true;
        passedError = err;
      };

      errorHandler(error, req, res, next);

      expect(nextCalled).toBe(true);
      expect(passedError).toBe(error);
    });
  });
});
