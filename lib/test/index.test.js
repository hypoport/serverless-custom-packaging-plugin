const scpp = require('../../lib/index.js');
const chai = require('chai');
const expect = chai.expect;

const sls = {
  service: {
    functions: {
      test_function: {
        package: {
          path: 'test/package',
          artifact: 'test/test.zip'
        }
      },
      another_test_function: {}
    }
  }
};

describe('custom packaging', function () {
  const instance = new scpp(sls, {});
  const functions = sls.service.functions;
  describe('#getFnSourceDir(functions, name)', function () {
    it('should return the right value', async () => {
      const result = await instance.getFnSourceDir(functions, "test_function");
      expect(result).to.equal("test/package");
    });
    it('should return the default if no artifact is provided', () => {
      return instance.getFnSourceDir(functions, "another_test_function").then(function (res) {
        expect(res).to.equal("another_test_function");
      });
    });
  });

  describe('#getFnTargetDir(functions, name)', function () {
    it('should return the right value', () => {
      return instance.getFnTarget(functions, "test_function").then(function (res) {
        expect(res).to.equal("test/test.zip");
      });
    });
    it('should return the default if no artifact is provided', () => {
      return instance.getFnTarget(functions, "another_test_function").then(function (res) {
        expect(res).to.equal("another_test_function.zip");
      });
    });
  });
});



