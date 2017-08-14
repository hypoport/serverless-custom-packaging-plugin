//TODO: To fix tests find out how to mock serverless

const scpp = require('../../lib/index.js');
const chai = require('chai');
const serverless = require('serverless');
const expect = chai.expect;

const config = {
  service: {
    functions: {
      test_function: {
        package: {
          path: 'test/package',
          artifact: 'test/test.zip',
          include_globs: ['**/*.py', '**/*.html']
        }
      },
      another_test_function: {}
    }
  }
};

const serverless_ = new serverless(config, {});
const instance = new scpp(serverless_, {});

console.log(instance);

describe('custom packaging', function () {
  const functions = instance.service.functions;
  describe('#getFnSourceDir(functionObject)', function () {
    it('should return the right value', async () => {
      const result = await instance.getFnSourceDir(functions.test_function);
      expect(result).to.equal("test/package");
    });
    it('should return the default if no artifact is provided', () => {
      return expect(instance.getFnSourceDir(functions.another_test_function)).to.be.false;
    });
  });

  describe('#getFnTargetDir(functionObject)', function () {
    it('should return the right value', () => {
      return expect(instance.getFnTarget(functions.test_function)).to.equal("test/test.zip");
    });
    it('should return the default if no artifact is provided', () => {
      return expect(instance.getFnTarget(functions.another_test_function)).to.be.false;
    });
  });

  describe('#getFnIncludeGlobs(functionObject)', function () {
    it('should return the right value', () => {
      return expect(instance.getFnIncludeGlobs(functions.test_function)).have.members(['**/*.py', '**/*.html']);
    });
    it('should return the default if no artifact is provided', () => {
      return expect(instance.getFnIncludeGlobs(functions.another_test_function)).to.equal("**/*.py");
    });
  });
});

describe('utilities', function () {
  describe('#createDirIfNotExists(directory)', function () {
    it('should return true', async () => {
      const result = await instance.createDirIfNotExists('lib/test/leave_empty');
      expect(result).to.be.true;
    });
  });
});


