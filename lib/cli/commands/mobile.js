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

  function getCallback(callback) {
    return function (error, result) {
      // TODO: clean up error presentation
      if (error && typeof error === 'object') {
        error = error.stack || error.message || JSON.stringify(error, null, 2);
      }

      callback(error, result);
    }
  }

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
      .header('Accept', 'application/json')
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

  mobile.listServices = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices');

    channel.GET(callback);
  };

  mobile.getService = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename);

    channel.GET(callback);
  };

  mobile.getServiceSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('settings');

    channel.GET(callback);
  };

  mobile.setServiceSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('settings')
      .header('Content-Type', 'application/json');

    channel.send('PATCH', settings, callback);
  };

  mobile.getLiveSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('livesettings');

    channel.GET(callback);
  };

  mobile.setLiveSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('livesettings')
      .header('Content-Type', 'application/json');


    channel.PUT(settings, callback);
  };

  mobile.getLogSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('logsettings');

    channel.GET(callback);
  };

  mobile.setLogSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('logsettings')
      .header('Content-Type', 'application/json');

    channel.PUT(settings, callback);
  };

  mobile.getAuthSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('authsettings');

    channel.GET(callback);
  };

  mobile.setAuthSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('authsettings')
      .header('Content-Type', 'application/json');

    channel.PUT(settings, callback);
  };

  mobile.getApnsSettings = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('settings');

    channel.GET(callback);
  };

  mobile.setApnsSettings = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('settings')
      .header('Content-Type', 'application/json');

    channel.POST(settings, callback);
  };

  mobile.regenerateKey = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('regenerateKey')
      .query('type', options.type);

    channel.POST(null, callback);
  };

  mobile.redeployService = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('redeploy');

    var progress = cli.progress('Redeploying mobile service');
    try {
      channel.POST(null, function (error, result) {
        progress.end();
        callback(error, result);
      });
    }
    catch (e) {
      progress.end();
      throw e;
    }
  };

  mobile.getLogs = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('logs');

    if (options.query) {
      options.query.split('&').forEach(function (keyvalue) {
        var kv = keyvalue.split('=');
        if (kv.length === 2) {
          channel.query(kv[0], kv[1]);
        }
        else {
          return callback(new Error('Invalid format of query parameter'));
        }
      })
    }
    else {
      channel.query('$top', options.top || 10);

      if (options.skip) {
        channel.query('$skip', options.skip)
      }

      if (options.type) {
        channel.query('$filter', "Type eq '" + options.type + "'");
      }
    }

    channel.GET(callback);
  };        

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
                row.cell('Name', s.name);
                row.cell('State', s.state);
                row.cell('URL', s.applicationUrl);
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
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            mobile.getService(options, function (error, service) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json(service);
              }
              else {
                ['name', 'state', 'applicationUrl', 'applicationKey', 'masterKey', 'webspace', 'region']
                  .forEach(function (item) {
                    if (service[item]) {
                      log.data(item, service[item]);
                    }
                  });

                if (service.tables.length > 0)
                {
                  var tables = '';
                  service.tables.forEach(function (table) { tables += (tables.length > 0 ? ',' : '') + table.name ; });
                  log.data('tables', tables);
                }
                else {
                  log.info('No tables are created. Use azure mobile table command to create tables.');
                }
              }
              
              callback();
            });
          }
        });

  mobile.command('redeploy [servicename]')
        .usage('[options] [servicename]')
        .whiteListPowershell()
        .description('Redeploy a mobile service')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            mobile.redeployService(options, function (error, service) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json({});
              }
              else {
                log.info('Service was redeployed.');
              }
              
              callback();
            });
          }
        });

  var keyTypes = ['application', 'master'];
  mobile.command('regenerateKey [type] [servicename]')
        .usage('[options] <type> [servicename]')
        .whiteListPowershell()
        .description('Regenerate the mobile service key')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (type, servicename, options, callback) {
          if (type) {
            ensuredType(type);
          }
          else {
            log.help('Choose key type:');
            cli.choose(keyTypes, function (i) { ensuredType(keyTypes[i]); });
          }

          function ensuredType(type) {
            if (type !== 'application' && type !== 'master') {
              return callback(new Error('The key type must be "application" or "master".'))
            }

            options.type = type;
            servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
            function ensuredServiceName(servicename) {
              options.servicename = servicename;
              mobile.regenerateKey(options, function (error, result) {
                if (error) {
                  return callback(error);
                }

                if (log.format().json) {
                  log.json(result);
                }
                else {
                  log.info('New ' + type + ' key is ' + result[type + 'Key']);
                }
                
                callback();
              });
            }
          }
        });

  mobile.command('logs [servicename]')
        .usage('[options] [servicename]')
        .whiteListPowershell()
        .description('Get mobile service logs')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-r, --query <query>', 'log query; takes precedence over --type, --skip, and --top')
        .option('-t, --type <type>', 'filter by entry <type>')
        .option('-k, --skip <skip>', 'skip the first <skip> number of rows')
        .option('-p, --top <top>', 'return the first <top> number of remaining rows')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            mobile.getLogs(options, function (error, logs) {
              if (error) {
                return callback(error);
              }

              if (log.format().json) {
                log.json(logs);
              }
              else {
                if (logs && logs.results && logs.results.length > 0) {
                  logs.results.forEach(function (entry) {
                    log.data('', '');                      

                    for (var i in entry) {
                      log.data(i, entry[i]);
                    }
                  });

                  log.data('', '');                      
                }
                else {
                  log.info('There are no matching log entries.')
                }
              }
              
              callback();
            });
          }
        });

  var mobileConfig = mobile.category('config')
        .description('Commands to manage your mobile service configuration');

  mobileConfig.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('Show your mobile service configuration settings')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            // unlike async.parallel, we want all operations to execute regardless if some have errors

            var progress = cli.progress('Getting mobile service configuration');
            var results = {};
            var operationCount = 0;
            function tryFinish() {
              if (++operationCount < 5) {
                return;
              }

              progress.end();

              if (log.format().json) {
                log.json(results);
              }
              else {
                var settings = {};
                [ 'dynamicSchemaEnabled',
                  'microsoftAccountClientSecret',
                  'microsoftAccountClientId',
                  'microsoftAccountPackageSID',
                  'facebookClientId',
                  'facebookClientSecret',
                  'twitterClientId',
                  'twitterClientSecret',
                  'googleClientId',
                  'googleClientSecret',
                  'logLevel',
                  'apnsMode',
                  'apnsPassword',
                  'apnsCertifcate'
                ].forEach(function (name) {
                  settings[name] = 'Unable to obtain the value of this setting';
                });

                if (results.service) {
                  if (typeof results.service.dynamicSchemaEnabled == 'boolean') {
                    settings.dynamicSchemaEnabled = results.service.dynamicSchemaEnabled.toString();  
                  }
                  else {
                    settings.dynamicSchemaEnabled = 'Not configured';
                  }
                }

                if (results.log) {
                  settings.logLevel = results.log.logLevel || 'Not configured';
                }

                if (results.live) {
                  settings.microsoftAccountClientSecret = results.live.clientSecret || 'Not configured';
                  settings.microsoftAccountClientId = results.live.clientID || 'Not configured';
                  settings.microsoftAccountPackageSID = results.live.packageSID || 'Not configured';
                }

                if (results.apns) {
                  results.apnsMode = results.apns.mode || 'Not configured';
                  results.apnsPassword = results.apns.password || 'Not configured';
                  results.apnsCertifcate = results.apns.certificate || 'Not configured';
                }

                if (Array.isArray(results.auth)) {
                  ['twitter', 'facebook', 'google'].forEach(function (provider) {
                    settings[provider + 'ClientId'] = 'Not configured';
                    settings[provider + 'ClientSecret'] = 'Not configured';
                  });

                  results.auth.forEach(function (creds) {
                    settings[creds.provider + 'ClientId'] = creds.appId;
                    settings[creds.provider + 'ClientSecret'] = creds.secret;
                  });
                }

                for (var i in settings) {
                  if (settings[i] == 'Not configured') {
                    log.data(i, settings[i].blue);  
                  }
                  else if (settings[i] == 'Unable to obtain the value of this setting') {
                    log.data(i, settings[i].red);  
                  }
                  else {
                    log.data(i, settings[i].green);  
                  }
                }
              }

              callback();
            }

            function createCallback(name) {
              return function (error, result) {
                log.silly(name, error);
                if (!error) {
                  results[name] = result;
                }

                tryFinish();
              }
            }

            try {
              mobile.getServiceSettings(options, createCallback('service'));
              mobile.getLiveSettings(options, createCallback('live'));
              mobile.getAuthSettings(options, createCallback('auth'));
              mobile.getApnsSettings(options, createCallback('apns'));
              mobile.getLogSettings(options, createCallback('log'));
            }
            catch (e) {
              progress.end();
              callback(e);
            }
          }
        });

  function createSetConfigHandler(coreGetHandler, coreSetHandler, picker1, picker2) {
    return function (options, newValue, callback) {
      coreGetHandler(options, function (error, result) {
        if (error) {
          return callback(error);
        }

        if (picker2) {
          if (Array.isArray(result)) {
            for (var i = 0; i < result.length; i++) {
              if (result[i].provider == picker1) {
                result[i][picker2] = newValue;
                break;
              }
            }
          }
        }
        else {
          result[picker1] = newValue;
        }

        result = JSON.stringify(result);
        coreSetHandler(options, result, callback);
      });
    }
  }

  var setConfigHandlers = {
    'dynamicSchemaEnabled': createSetConfigHandler(mobile.getServiceSettings, mobile.setServiceSettings, 'dynamicSchemaEnabled'),
    'microsoftAccountClientSecret': createSetConfigHandler(mobile.getLiveSettings, mobile.setLiveSettings, 'clientSecret'),
    'microsoftAccountClientId': createSetConfigHandler(mobile.getLiveSettings, mobile.setLiveSettings, 'clientID'),
    'microsoftAccountPackageSID': createSetConfigHandler(mobile.getLiveSettings, mobile.setLiveSettings, 'packageSID'),
    'facebookClientId': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'facebook', 'appId'),
    'facebookClientSecret': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'facebook', 'secret'),
    'twitterClientId': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'twitter', 'appId'),
    'twitterClientSecret': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'twitter', 'secret'),
    'googleClientId': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'google', 'appId'),
    'googleClientSecret': createSetConfigHandler(mobile.getAuthSettings, mobile.setAuthSettings, 'google', 'secret'),
    'logLevel': createSetConfigHandler(mobile.getLogSettings, mobile.setLogSettings, 'logLevel'),
    'apnsMode': createSetConfigHandler(mobile.getApnsSettings, mobile.setApnsSettings, 'mode'),
    'apnsPassword': createSetConfigHandler(mobile.getApnsSettings, mobile.setApnsSettings, 'password'),
    'apnsCertifcate': createSetConfigHandler(mobile.getApnsSettings, mobile.setApnsSettings, 'certificate')
  };

  mobileConfig.command('set <servicename> <key> [value]')
        .usage('[options] <servicename> <key> [value]')
        .description('Set a mobile service configuration setting')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'read the value of the setting from a file')
        .execute(function (servicename, key, value, options, callback) {
          if (!getConfigHandlers[key]) {
            log.info('Supported keys:')
            for (var i in getConfigHandlers) {
              log.info(i.blue);
            }
            return callback('Unsupported key ' + key.red);
          }
          else if (!value && !options.file) {
            return callback('Either value parameter must be provided or --file option specified');
          }
          else {
            if (!value && options.file) {
              value = fs.readFileSync(options.file, 'utf8');
              log.info('Value was read from ' + options.file);
            }

            if (key === 'dynamicSchemaEnabled') {
              if (value === 'true') {
                value = true;
              }
              else if (value === 'false') {
                value = false;
              }
              else {
                return callback('The value must be either true or false');
              }
            }

            options.servicename = servicename;
            setConfigHandlers[key](options, value, getCallback(callback));
          }
        });

  function createGetConfigHandler(coreHandler, picker1, picker2) {
    return function (options, callback) {
      coreHandler(options, function (error, result) {
        if (error) {
          return callback(error);
        }

        if (picker2) {
          if (Array.isArray(result)) {
            for (var i = 0; i < result.length; i++) {
              if (result[i].provider == picker1) {
                return callback(null, result[i][picker2]);
              }
            }
          }

          callback(null, null);
        }
        else {
          callback(null, result[picker1]);
        }
      });
    }
  }

  var getConfigHandlers = {
    'dynamicSchemaEnabled': createGetConfigHandler(mobile.getServiceSettings, 'dynamicSchemaEnabled'),
    'microsoftAccountClientSecret': createGetConfigHandler(mobile.getLiveSettings, 'clientSecret'),
    'microsoftAccountClientId': createGetConfigHandler(mobile.getLiveSettings, 'clientID'),
    'microsoftAccountPackageSID': createGetConfigHandler(mobile.getLiveSettings, 'packageSID'),
    'facebookClientId': createGetConfigHandler(mobile.getAuthSettings, 'facebook', 'appId'),
    'facebookClientSecret': createGetConfigHandler(mobile.getAuthSettings, 'facebook', 'secret'),
    'twitterClientId': createGetConfigHandler(mobile.getAuthSettings, 'twitter', 'appId'),
    'twitterClientSecret': createGetConfigHandler(mobile.getAuthSettings, 'twitter', 'secret'),
    'googleClientId': createGetConfigHandler(mobile.getAuthSettings, 'google', 'appId'),
    'googleClientSecret': createGetConfigHandler(mobile.getAuthSettings, 'google', 'secret'),
    'logLevel': createGetConfigHandler(mobile.getLogSettings, 'logLevel'),
    'apnsMode': createGetConfigHandler(mobile.getApnsSettings, 'mode'),
    'apnsPassword': createGetConfigHandler(mobile.getApnsSettings, 'password'),
    'apnsCertifcate': createGetConfigHandler(mobile.getApnsSettings, 'certificate')
  };

  mobileConfig.command('get <servicename> <key>')
        .usage('[options] <servicename> <key>')
        .description('Get a mobile service configuration setting')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'save the value of the setting to a file')
        .execute(function (servicename, key, options, callback) {
          if (!getConfigHandlers[key]) {
            log.info('Supported keys:')
            for (var i in getConfigHandlers) {
              log.info(i.blue);
            }
            return callback('Unsupported key ' + key.red);
          }
          else {
            options.servicename = servicename;
            getConfigHandlers[key](options, function (error, result) {
              if (error) {
                return callback(error);
              }

              if (result) {
                if (typeof options.file === 'string') {
                  fs.writeFileSync(options.file, result);
                  log.info('Written value to ' + options.file);
                }
                else {
                  log.data(key, result.toString().green);
                }
              }
              else {
                log.warn('Setting is not configured'.blue)
              }

              return callback();
            });
          }
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
};
