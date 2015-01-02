/**!
 * cnpmjs.org - test/controllers/registry/package/remove_version.test.js
 *
 * Copyright(c) cnpmjs.org and other contributors.
 * MIT Licensed
 *
 * Authors:
 *  fengmk2 <fengmk2@gmail.com> (http://fengmk2.github.com)
 */

'use strict';

/**
 * Module dependencies.
 */

var should = require('should');
var request = require('supertest');
var mm = require('mm');
var app = require('../../../../servers/registry');
var utils = require('../../../utils');
var packageService = require('../../../../services/package');
var nfs = require('../../../../common/nfs');

describe('controllers/registry/package/remove_version.test.js', function () {
  afterEach(mm.restore);

  var lastRev;
  var lastRevScoped;
  before(function (done) {
    var pkg = utils.getPackage('testmodule-remove_version-1', '0.0.1', utils.admin);
    request(app.listen())
    .put('/' + pkg.name)
    .set('authorization', utils.adminAuth)
    .send(pkg)
    .expect(201, function (err, res) {
      should.not.exist(err);
      lastRev = res.body.rev;
      var pkg = utils.getPackage('@cnpmtest/testmodule-remove_version-1', '0.0.1', utils.admin);
      request(app.listen())
      .put('/' + pkg.name)
      .set('authorization', utils.adminAuth)
      .send(pkg)
      .expect(201, function (err, res) {
        should.not.exist(err);
        lastRevScoped = res.body.rev;
        done();
      });
    });
  });

  it('should 404 when version format error', function (done) {
    request(app)
    .del('/testmodule-remove_version-1/download/testmodule_remove_version123.tgz/-rev/112312312321')
    .set('authorization', utils.adminAuth)
    .expect({
      error: 'not_found',
      reason: 'document not found'
    })
    .expect(404, done);
  });

  it('should 404 when rev format error', function (done) {
    request(app)
    .del('/testmodule-remove_version-1/download/testmodule-remove_version-1-1.0.1.tgz/-rev/abc')
    .set('authorization', utils.adminAuth)
    .expect({
      error: 'not_found',
      reason: 'document not found'
    })
    .expect(404, done);
  });

  it('should 404 when version not exists', function (done) {
    request(app)
    .del('/testmodule-remove_version-1/download/testmodule-remove_version-1-1.0.1.tgz/-rev/112312312321')
    .set('authorization', utils.adminAuth)
    .expect({
      error: 'not_found',
      reason: 'document not found'
    })
    .expect(404, done);
  });

  it('should 401 when no auth', function (done) {
    request(app)
    .del('/testmodule-remove_version-1/download/testmodule-remove_version-1-0.0.1.tgz/-rev/' + lastRev)
    .expect(401, done);
  });

  it('should 403 when auth error', function (done) {
    request(app)
    .del('/testmodule-remove_version-1/download/testmodule-remove_version-1-0.0.1.tgz/-rev/' + lastRev)
    .set('authorization', utils.otherUserAuth)
    .expect(403, done);
  });

  it('should 200 when delete success', function (done) {
    request(app)
    .del('/testmodule-remove_version-1/download/testmodule-remove_version-1-0.0.1.tgz/-rev/' + lastRev)
    .set('authorization', utils.adminAuth)
    .expect(200, done);
  });

  it('should 200 when delete scoped package success', function (done) {
    request(app)
    .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-0.0.1.tgz/-rev/123123123')
    .set('authorization', utils.adminAuth)
    .expect(200, done);
  });

  describe('mock error', function () {
    before(function (done) {
      var pkg = utils.getPackage('testmodule-remove_version-1', '0.0.2', utils.admin);
      request(app.listen())
      .put('/' + pkg.name)
      .set('authorization', utils.adminAuth)
      .send(pkg)
      .expect(201, function (err) {
        should.not.exist(err);
        var pkg = utils.getPackage('@cnpmtest/testmodule-remove_version-1', '0.0.2', utils.admin);
        request(app.listen())
        .put('/' + pkg.name)
        .set('authorization', utils.adminAuth)
        .send(pkg)
        .expect(201, done);
      });
    });

    it('should auto add cdn key', function (done) {
      var getModule = packageService.getModule;
      mm(packageService, 'getModule', function* (name, version) {
        var mod = yield* getModule.call(packageService, name, version);
        delete mod.package.dist.key;
        return mod;
      });

      request(app)
      .del('/testmodule-remove_version-1/download/testmodule-remove_version-1-0.0.2.tgz/-rev/' + lastRev)
      .set('authorization', utils.adminAuth)
      .expect(200, done);
    });

    it('should mock nfs.remove error', function (done) {
      mm(nfs, 'remove', function* (key) {
        throw new Error('mock remove ' + key + ' error');
      });
      request(app)
      .del('/@cnpmtest/testmodule-remove_version-1/download/@cnpmtest/testmodule-remove_version-1-0.0.2.tgz/-rev/1')
      .set('authorization', utils.adminAuth)
      .expect(200, done);
    });
  });
});