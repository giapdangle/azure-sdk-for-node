/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

var common = require('../common');
var fs = require('fs');
var path = require('path');
var url = require('url');
var util = require('util');
var crypto = require('crypto');
var pfx2pem = require('../../util/certificates/pkcs').pfx2pem;
var Channel = require('../channel');
var async = require('async');
var child_process = require('child_process');
var utils = require('../utils');
var constants = require('../constants');
var cacheUtils = require('../cacheUtils');
var js2xml = require('../../util/js2xml');

var linkedRevisionControl = require('../linkedrevisioncontrol');

exports.init = function (cli) {

  var log = cli.output;

  function getChannel(options) {
    options.subscription = options.subscription || cli.category('account').lookupSubscriptionId(options.subscription);
    var account = cli.category('account');
    var managementEndpoint = url.parse(utils.getManagementEndpointUrl(account.managementEndpointUrl()));
    var pem = account.managementCertificate();
    var host = managementEndpoint.hostname;
    var port = managementEndpoint.port;

    var channel = new Channel({
      host: host,
      port: port,
      key: pem.key,
      cert: pem.cert
    }).header('x-ms-version', '2012-03-01')
      .path(options.subscription)
      .path('services')
      .path('mobileservices')

    var proxyString =
            process.env.HTTPS_PROXY ||
            process.env.https_proxy ||
            process.env.ALL_PROXY ||
            process.env.all_proxy;

    if (proxyString !== undefined) {
      var proxyUrl = url.parse(proxyString);
      if (proxyUrl.protocol !== 'http:' &&
                proxyUrl.protocol !== 'https:') {
        // fall-back parsing support XXX_PROXY=host:port environment variable values
        proxyUrl = url.parse('http://' + proxyString);
      }

      channel = channel.add({ proxy: proxyUrl });
    }

    return channel;
  }

  var mobile = cli.category('mobile')
        .description('Commands to manage your mobile services');

  mobile.command('list')
        .usage('[options]')
        .whiteListPowershell()
        .description('List your mobile services')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (options, callback) {          
          mobile.listServices(options, function (error, services) {
            if (error) {
              return callback(error);
            }

            if (services && services.length > 0) {
              log.table(services, function (row, s) {
                row.cell('Name', s.Name);
                row.cell('State', s.State);
              });
            } else {
              log.info('No mobile services created yet. You can create new mobile services through the portal.');
            }            

            callback();
          });
        });

  mobile.command('show [servicename]')
        .usage('[options] [servicename]')
        .whiteListPowershell()
        .description('Show details for a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, callback) {
          log.error('Not implemented');
        });

  mobile.command('redeploy [servicename]')
        .usage('[options] [servicename]')
        .whiteListPowershell()
        .description('Redeploy a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, callback) {
          log.error('Not implemented');
        });

  mobile.command('regenerateKey <type> [servicename]')
        .usage('[options] <type> [servicename]')
        .whiteListPowershell()
        .description('Regenerate the mobile service key')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (type, name, options, callback) {
          log.error('Not implemented');
        });

  mobile.command('logs [query] [servicename]')
        .usage('[options] [query] [servicename]')
        .whiteListPowershell()
        .description('Get mobile service logs')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-t, --type <type>', 'filter by entry <type>')
        .option('-k, --skip <skip>', 'skip the first <skip> number of rows')
        .option('-p, --top <top>', 'return the first <top> number of remaining rows')
        .execute(function (name, options, callback) {
          log.error('Not implemented: you specify either "query" for full flexibility or use "skip" and "top"');
        });

  var mobileConfig = mobile.category('config')
        .description('Commands to manage your mobile service configuration');

  mobileConfig.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('Show your mobile service configuration settings')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (name, options, callback) {
          var settings = {
            dynamicSchemaEnabled: false,
            microsoftAccountClientSecret: '',
            microsoftAccountClientId: '',
            microsoftAccountPackageSID: '',
            facebookClientId: '',
            facebookClientSecret: '',
            twitterClientId: '',
            twitterClientSecret: '',
            googleClientId: '',
            googleClientSecret: '',
            logLevel: 'error',
            apnsCertifcate: '',
            apnsMode: 'dev',
            apnsPassword: 'abc!123'
          };
          for (var i in settings) {
            log.info(i + '=' + settings[i]);
          }
        });

  mobileConfig.command('set <key> [value] [servicename]')
        .usage('[options] <key> [value] [servicename]')
        .description('Set a mobile service configuration setting')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'read the value of the setting from a file')
        .execute(function (key, value, servicename, options, callback) {
          log.error('Not implemented');
        });

  mobileConfig.command('get <key> [servicename]')
        .usage('[options] <key> [servicename]')
        .description('Get a mobile service configuration setting')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'save the value of the setting to a file')
        .execute(function (key, servicename, options, callback) {
          log.error('Not implemented');
        });

  mobileConfig.command('clear <key> [servicename]')
        .usage('[options] <key> [servicename]')
        .description('Restore a mobile service configuration setting to the default value')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (key, servicename, options, callback) {
          log.error('Not implemented');
        });

  var mobileTable = mobile.category('table')
        .description('Commands to manage your mobile service tables');

  mobileTable.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service tables')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          log.error('Not implemented');
        });

  mobileTable.command('show [tablename] [servicename]')
        .usage('[options] [tablename] [servicename]')
        .description('Show details for a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (tablename, servicename, options, callback) {
          log.error('Not implemented: show both table properties and permissions');
        });

  mobileTable.command('create [tablename] [servicename]')
        .usage('[options] [tablename] [servicename]')
        .description('List your mobile service tables')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-i, --insert <role>', 'authorization role for insert operations')
        .option('-q, --query <role>', 'authorization role for query operations')
        .option('-u, --update <role>', 'authorization role for update operations')
        .option('-d, --delete <role>', 'authorization role for delete operations')
        .execute(function (tablename, servicename, options, callback) {
          log.error('Not implemented');
        });

  mobileTable.command('update [tablename] [servicename]')
        .usage('[options] [tablename] [servicename]')
        .description('Update mobile service table properties')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-i, --insertRole <role>', 'authorization role for insert operations')
        .option('-q, --queryRole <role>', 'authorization role for query operations')
        .option('-u, --updateRole <role>', 'authorization role for update operations')
        .option('-d, --deleteRole <role>', 'authorization role for delete operations')
        .option('--deleteColumn <column>', 'column to delete')
        .option('--addIndex <column>', 'column to create an index on')
        .option('--deleteIndex <column>', 'column to delete an index from')
        .execute(function (tablename, servicename, options, callback) {
          log.error('Not implemented: updates permissions');
        });

  mobileTable.command('delete [tablename] [servicename]')
        .usage('[options] [tablename] [servicename]')
        .description('Delete a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (tablename, servicename, options, callback) {
          log.error('Not implemented');
        });

  mobileTable.command('data [query] [tablename] [servicename]')
        .usage('[options] [query] [tablename] [servicename]')
        .description('Query data from a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-k, --skip <top>', 'skip the first <skip> number of rows')
        .option('-t, --top <top>', 'return the first <top> number of remaining rows')
        .execute(function (tablename, servicename, options, callback) {
          log.error('Not implemented: you specify either "query" for full flexibility or use "skip" and "top"');
        });

  var mobileScript = mobile.category('script')
        .description('Commands to manage your mobile service scripts');

  mobileScript.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-t, --table <tablename>', 'only scripts associated with this table')
        .execute(function (servicename, options, callback) {
          log.error('Not implemented');
        });

  mobileScript.command('show [scriptname] [servicename]')
        .usage('[options] [scriptname] [servicename]')
        .description('Show details for a mobile service script')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (scriptname, servicename, options, callback) {
          log.error('Not implemented: script name is convention based, e.g. "feedback" or "orders/insert"');
        });

  mobileScript.command('download [scriptname] [servicename]')
        .usage('[options] [scriptname] [servicename]')
        .description('Downloads mobile service script or scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-p, --path <path>', 'filesystem location to save the script or scripts to; working directory by default')
        .option('-f, --force', 'override existing files')
        .execute(function (scriptname, servicename, options, callback) {
          log.error('Not implemented: script name is convention based, e.g. "feedback" or "orders/*" or "orders/query"');
        });

  mobileScript.command('upload [scriptname] [servicename]')
        .usage('[options] [scriptname] [servicename]')
        .description('Downloads mobile service script or scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-p, --path <path>', 'filesystem location to read scripts from; working directory by default')
        .execute(function (sscriptname, ervicename, options, callback) {
          log.error('Not implemented: script name is convention based, e.g. "*" or "feedback" or "orders/*" or "orders/query"');
        });

  mobileScript.command('delete [scriptname] [servicename]')
        .usage('[options] [scriptname] [servicename]')
        .description('Deletes mobile service script or scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (scriptname, servicename, options, callback) {
          log.error('Not implemented: script name is convention based, e.g. "*" or "feedback" or "orders/*" or "orders/query"');
        });


  mobile.listServices = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var progress = cli.progress('Enumerating mobile services');
    try {

      var channel = getChannel(options)
        .path('mobileservices');

      channel.GET(function (error, result) {
        progress.end();

        if (error) {
          return callback(error);
        }

        if (typeof result === 'object' && result.ServiceResource) {
          if (Array.isArray(result.ServiceResource)) {
            callback(null, result.ServiceResource);
          }
          else if (typeof result.ServiceResource === 'object' ) {
            callback(null, [ result.ServiceResource ]);
          }
          else {
            callback(new Error('Invalid response from Windows Azure'));
          }
        }
        else {
          callback(null, []);
        }
      });

    }
    finally {
      progress.end();
    }
  };

};
