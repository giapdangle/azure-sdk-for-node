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

// polyfill existsSync if running with 0.6.x
if (!fs.existsSync) {
  fs.existsSync = path.existsSync;
}

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

  mobile.listTables = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables');

    channel.GET(callback);
  };

  mobile.getApnsScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('scripts')
      .path('feedback');

    channel.GET(callback);
  };

  mobile.setApnsScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('scripts')
      .path('feedback')
      .header('Content-Type', 'text/plain');

    channel.PUT(script, callback);
  };

  mobile.deleteApnsScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('apns')
      .path('scripts')
      .path('feedback');

    channel.DELETE(callback);
  };

  mobile.getSharedScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    mobile.getApnsScript(options, function (error, script) {
      if (error) {
        return callback(error);
      }

      callback(null, [{ name: 'apnsFeedback', sizeBytes: Buffer.byteLength(script, 'utf8') }]);
    });
  };

  mobile.getSharedScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    if (options.script.shared.name !== 'apnsFeedback') {
      return callback(new Error('Unsupported shared script name: ' + options.script.shared.name));
    }

    mobile.getApnsScript(options, callback);
  };

  mobile.setSharedScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    if (options.script.shared.name !== 'apnsFeedback') {
      return callback(new Error('Unsupported shared script name: ' + options.script.shared.name));
    }

    mobile.setApnsScript(options, script, callback);
  };

  mobile.deleteSharedScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    if (options.script.shared.name !== 'apnsFeedback') {
      return callback(new Error('Unsupported shared script name: ' + options.script.shared.name));
    }

    mobile.deleteApnsScript(options, callback);
  };

  mobile.getSchedulerScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs');

    channel.GET(callback);
  };

  mobile.getSchedulerScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.script.scheduler.name)
      .path('script');

    channel.GET(callback);
  };

  mobile.setSchedulerScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.script.scheduler.name)
      .path('script')
      .header('Content-Type', 'text/plain');

    channel.PUT(script, callback);
  };

  mobile.deleteSchedulerScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('scheduler')
      .path('jobs')
      .path(options.script.scheduler.name);

    channel.DELETE(callback);
  };

  mobile.getTableScripts = function (options, table, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(table)
      .path('scripts');

    channel.GET(callback);
  };

  mobile.getTableScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.script.table.name)
      .path('scripts')
      .path(options.script.table.operation)
      .path('code');

    channel.GET(callback);
  };

  mobile.setTableScript = function (options, script, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.script.table.name)
      .path('scripts')
      .path(options.script.table.operation)
      .path('code')
      .header('Content-Type', 'text/plain');

    channel.PUT(script, callback);
  };

  mobile.deleteTableScript = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.script.table.name)
      .path('scripts')
      .path(options.script.table.operation);

    channel.DELETE(callback);
  };

  mobile.getAllTableScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var results = [];
    mobile.listTables(options, function (error, tables) {
      if (error) {
        return callback(error);
      }

      var resultCount = 0;
      var finalError;
      tables.forEach(function (table) {
        mobile.getTableScripts(options, table.name, function (error, scripts) {
          finalError = finalError || error;
          if (Array.isArray(scripts)) {
            scripts.forEach(function (script) {
              script.table = table.name;
              results.push(script);
            });
          }

          if (++resultCount == tables.length) {
            callback(finalError, results);
          }
        });
      });
    });
  };

  mobile.getTable = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename);

    channel.GET(callback);
  };

  mobile.createTable = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .header('Content-Type', 'application/json');

    channel.POST(settings, callback);
  }; 

  mobile.deleteTable = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename);

    channel.DELETE(callback);
  };

  mobile.getPermissions = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('permissions');

    channel.GET(callback);
  };

  mobile.updatePermissions = function (options, settings, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('permissions')
      .header('Content-Type', 'application/json');

    channel.PUT(settings, callback);
  };

  mobile.getScripts = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('scripts');

    channel.GET(callback);
  };

   mobile.getColumns = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('columns');

    channel.GET(callback);
  };

  mobile.deleteColumn = function (options, column, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('columns')
      .path(column);

    channel.DELETE(callback);
  };  

  mobile.createIndex = function (options, column, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('indexes')
      .path(column);

    channel.PUT(null, callback);
  };    

  mobile.deleteIndex = function (options, column, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('indexes')
      .path(column);

    channel.DELETE(callback);
  };  

  mobile.getData = function (options, callback) {
    log.verbose('Subscription', options.subscription);
    var channel = getChannel(options)
      .path('mobileservices')
      .path(options.servicename)
      .path('tables')
      .path(options.tablename)
      .path('data');

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
    }

    channel.GET(callback);    
  }

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
                      log.data(item, service[item].toString().green);
                    }
                  });

                if (service.tables.length > 0)
                {
                  var tables = '';
                  service.tables.forEach(function (table) { tables += (tables.length > 0 ? ',' : '') + table.name ; });
                  log.data('tables', tables.green);
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
            setConfigHandlers[key](options, value, callback);
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

  var mobileTable = mobile.category('table')
        .description('Commands to manage your mobile service tables');

  mobileTable.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service tables')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            mobile.listTables(options, function (error, tables) {
              if (error) {
                return callback(error);
              }

              if (tables && tables.length > 0) {
                log.table(tables, function (row, s) {
                  row.cell('Name', s.name);
                  row.cell('Indexes', s.metrics.indexCount);
                  row.cell('Rows', s.metrics.recordCount);
                  row.cell('Bytes', s.metrics.sizeBytes);
                });
              } else {
                log.info('No tables created yet. You can create a mobile service table using azure mobile table create command.');
              }            

              callback();
            });
          }
        });

  mobileTable.command('show [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Show details for a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, tablename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : cli.prompt('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;

              // unlike async.parallel, we want all operations to execute regardless if some have errors

              var progress = cli.progress('Getting table information');
              var results = {};
              var operationCount = 0;
              function tryFinish() {
                if (++operationCount < 4) {
                  return;
                }

                progress.end();

                if (log.format().json) {
                  log.json(results);
                }
                else if (!results.table) {
                  return callback('Table ' + tablename + ' or mobile service ' + servicename + ' does not exist.')
                }
                else {
                  log.info('Table statistics:'.green);
                  log.data('Number of records', results.table.metrics.recordCount.toString().green);
                  log.data('Size in bytes', results.table.metrics.sizeBytes.toString().green);

                  log.info('Table operations:'.green);
                  log.table(['insert', 'read', 'update', 'delete'], function (row, s) {
                    row.cell('Operation', s);

                    var script;
                    if (results.scripts) {
                      for (var i = 0; i < results.scripts.length; i++) {
                        if (results.scripts[i].operation === s) {
                          script = results.scripts[i];
                          break;
                        }
                      }

                      row.cell('Script', script ? script.sizeBytes.toString() + ' bytes' : 'Not defined');
                    }
                    else {
                      row.cell('Script', 'N/A');
                    }

                    if (results.permissions) {
                      row.cell('Permissions', results.permissions[s] || 'default');
                    }
                    else {
                      row.cell('Permissions', 'N/A'); 
                    }

                  });

                  if (results.columns) {
                    log.info('Table columns:'.green);
                    log.table(results.columns, function (row, s) {
                      row.cell('Name', s.name);
                      row.cell('Type', s.type);
                      row.cell('Indexed', s.indexed ? 'Yes' : '');
                    });
                  }
                  else {
                    log.error('Unable to obtain table columns')
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
                mobile.getTable(options, createCallback('table'));
                mobile.getPermissions(options, createCallback('permissions'));
                mobile.getColumns(options, createCallback('columns'));
                mobile.getScripts(options, createCallback('scripts'));
              }
              catch (e) {
                progress.end();
                callback(e);
              }
            }
          }
        });

  var roles = ['user', 'public', 'application', 'admin'];
  var operations = ['insert', 'read', 'update', 'delete'];
  mobileTable.command('create [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('List your mobile service tables')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-i, --insert <role>', 'authorization role for insert operations')
        .option('-q, --read <role>', 'authorization role for read operations')
        .option('-u, --update <role>', 'authorization role for update operations')
        .option('-d, --delete <role>', 'authorization role for delete operations')
        .execute(function (servicename, tablename, options, callback) {
          if (operations.some(function (item) {
            if (options[item] && !roles.some(function (role) { return options[item] === role; })) {
              callback('Authorization role for ' + item + ' operation must be one of ' + roles.join(', ') + '.');
              return true;
            }

            return false;
          })) {
            return;
          }

          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : cli.prompt('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;

              var settings = {
                name: tablename
              };

              operations.forEach(function (operation) {
                if (options[operation]) {
                  settings[operation] = options.operation;
                }
              })

              var progress = cli.progress('Creating table');
              try {
                mobile.createTable(options, JSON.stringify(settings), function (error) {
                  progress.end();
                  callback(error);
                });
              }
              catch (e) {
                progress.end();
                throw e;
              }
            }
          };
        });

  mobileTable.command('update [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Update mobile service table properties')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-i, --insertRole <role>', 'authorization role for insert operations')
        .option('-q, --readRole <role>', 'authorization role for query operations')
        .option('-u, --updateRole <role>', 'authorization role for update operations')
        .option('-d, --deleteRole <role>', 'authorization role for delete operations')
        .option('--deleteColumn <columns>', 'comma separated list of columns to delete')
        .option('--addIndex <columns>', 'comma separated list of columns to create an index on')
        .option('--deleteIndex <columns>', 'comma separated list of columns to delete an index from')
        .execute(function (servicename, tablename, options, callback) {
          if (operations.some(function (item) {
            if (options[item + 'Role'] && !roles.some(function (role) { return options[item + 'Role'] === role; })) {
              callback('Authorization role for ' + item + ' operation must be one of ' + roles.join(', ') + '.');
              return true;
            }

            return false;
          })) {
            return;
          }

          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : cli.prompt('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;

              var plan = [];

              // add permission update to plan

              var permissions;
              operations.forEach(function (op) {
                if (options[op + 'Role']) {
                  permissions = permissions || {};
                  permissions[op] = options[op + 'Role'];
                }
              });

              if (permissions) {
                plan.push({
                  progress: 'Updating permissions',
                  success: 'Updated permissions',
                  failure: 'Failed to update permissions',
                  handler: function (callback) {
                    mobile.updatePermissions(options, JSON.stringify(permissions), callback);
                  }
                });
              }

              // add index deletion to plan

              if (options.deleteIndex) {
                options.deleteIndex.split(',').forEach(function (column) {
                  plan.push({
                    progress: 'Deleting index from column ' + column,
                    success: 'Deleted index from column ' + column,
                    failure: 'Failed to delete index from column ' + column,
                    handler: function (callback) {
                      mobile.deleteIndex(options, column, callback);
                    }
                  });
                });
              }

              // add index addition to plan

              if (options.addIndex) {
                options.addIndex.split(',').forEach(function (column) {
                  plan.push({
                    progress: 'Adding index to column ' + column,
                    success: 'Added index to column ' + column,
                    failure: 'Failed to add index to column ' + column,
                    handler: function (callback) {
                      mobile.createIndex(options, column, callback);
                    }
                  });
                });
              }

              // add column deletion to plan

              if (options.deleteColumn) {
                options.deleteColumn.split(',').forEach(function (column) {
                  plan.push({
                    progress: 'Deleting column ' + column,
                    success: 'Deleted column ' + column,
                    failure: 'Failed to delete column ' + column,
                    handler: function (callback) {
                      mobile.deleteColumn(options, column, callback);
                    }
                  });
                });
              }

              // execute plan

              if (plan.length == 0) {
                log.info('No updates performed. Check the list of available updates with --help.');
              }
              else {
                var failures = 0;
                function doStep(stepIndex) {
                  if (stepIndex == plan.length) {
                    return callback(failures > 0 ? 'Not all update operations completed successfuly.' : null);
                  }

                  var step = plan[stepIndex];
                  var progress = cli.progress(step.progress);
                  try {
                    step.handler(function (error) {
                      progress.end();
                      if (error) {
                        log.error(step.failure);
                        failures++;
                      }
                      else {
                        log.info(step.success);
                      }

                      doStep(stepIndex + 1);
                    });
                  }
                  catch (e) {
                    console.log(e);
                    progress.end();
                    failures++;
                    doStep(stepIndex + 1);
                  }
                }

                doStep(0);
              }
            }
          }
        });

  mobileTable.command('delete [servicename] [tablename]')
        .usage('[options] [servicename] [tablename]')
        .description('Delete a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, tablename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : cli.prompt('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;

              var progress = cli.progress('Deleting table');
              try {
                mobile.deleteTable(options, function (error) {
                  progress.end();
                  callback(error);
                });
              }
              catch (e) {
                progress.end();
                throw e;
              }
            }
          }
        });

  mobileTable.command('data [servicename] [tablename] [query]')
        .usage('[options] [servicename] [tablename] [query]')
        .description('Query data from a mobile service table')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-k, --skip <top>', 'skip the first <skip> number of rows')
        .option('-t, --top <top>', 'return the first <top> number of remaining rows')
        .option('-l, --list', 'display results in list format')
        .execute(function (servicename, tablename, query, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            tablename ? ensuredTableName(tablename) : cli.prompt('Table name: ', ensuredTableName);
            function ensuredTableName(tablename) {
              options.tablename = tablename;
              options.query = query;
              mobile.getData(options, function (error, data) {
                if (error) {
                  return callback(error);
                }

                if (log.format().json) {
                  log.json(data);
                }
                else if (!Array.isArray(data) || data.length == 0) {
                  log.info("No matching records found");
                }
                else if (options.list) {
                  data.forEach(function (record) {
                    log.data('', '');
                    for (var i in record) {
                      log.data(i, record[i] === null ? '<null>'.green : record[i].toString().green);
                    }
                  });
                  log.data('', '');                  
                }
                else {
                  log.table(data, function (row, s) {
                    for (var i in s) {
                      row.cell(i, s[i]);
                    }
                  });
                }

                callback();
              });
            }
          }
        });

  var mobileScript = mobile.category('script')
        .description('Commands to manage your mobile service scripts');

  mobileScript.command('list [servicename]')
        .usage('[options] [servicename]')
        .description('List mobile service scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;

            // unlike async.parallel, we want all operations to execute regardless if some have errors

            var progress = cli.progress('Getting script information');
            var results = {};
            var operationCount = 0;
            function tryFinish() {
              if (++operationCount < 3) {
                return;
              }

              progress.end();

              if (log.format().json) {
                log.json(results);
              }
              else {
                if (!results.table) {
                  log.error('Unable to get table scripts');
                }
                else if (!Array.isArray(results.table) || results.table.length == 0) {
                  log.info('There are no table scripts. Create scripts using azure mobile script upload command.');
                }
                else {
                  log.info('Table scripts'.green);
                  log.table(results.table, function (row, s) {
                    row.cell('Name', 'table/' + s.table + '.' + s.operation);
                    row.cell('Size', s.sizeBytes);
                  });
                }

                if (!results.shared) {
                  log.error('Unable to get shared scripts');
                }
                else if (!Array.isArray(results.shared) || results.shared.length == 0) {
                  log.info('There are no shared scripts. Create scripts using azure mobile script upload command.');
                }
                else {
                  log.info('Shared scripts'.green);
                  log.table(results.table, function (row, s) {
                    row.cell('Name', s.name);
                    row.cell('Size', s.sizeBytes);
                  }); 
                }

                if (!results.scheduler) {
                  log.error('Unable to get scheduler scripts');
                }
                else if (!Array.isArray(results.scheduler) || results.scheduler.length == 0) {
                  log.info('There are no scheduler scripts. Create scheduler scripts using azure mobile scheduler command.');
                }
                else {
                  log.info('Scheduler scripts'.green);
                  log.table(results.table, function (row, s) {
                    row.cell('Name', 'scheduler/' + s.name);
                    row.cell('Status', s.status);
                    row.cell('Interval', s.interval);
                    row.cell('Last run', s.lastRun);
                    row.cell('Next run', s.nextRun);
                  }); 
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
              mobile.getAllTableScripts(options, createCallback('table'));
              mobile.getSharedScripts(options, createCallback('shared'));
              mobile.getSchedulerScripts(options, createCallback('scheduler'));
            }
            catch (e) {
              progress.end();
              callback(e);
            }
          }
        });

  function parseScriptName(scriptname) {
    var result;

    var match = scriptname.match(/^table\/([^\.]+)\.(insert|read|update|delete)(?:$|\.js$)/);
    if (match) {
      result = { type: 'table', table: { name: match[1], operation: match[2] } };
    }
    else {
      match = scriptname.match(/^scheduler\/([^\.]+)(?:$|\.js$)/);
      if (match) {
        result = { type: 'scheduler', scheduler: { name: match[1] } };
      }
      else {
        match = scriptname.match(/^shared\/apnsFeedback(?:$|\.js$)/);
        if (match) {
          result = { type: 'shared', shared: { name: 'apnsFeedback' } };
        }
      }
    }

    return result;
  }

  function saveScriptFile(scriptSpec, script, output, force) {
    var file;
    var dir;

    if (output) {
      file = output;
    }
    else {
      dir = './' + scriptSpec.type;
      file = dir + '/';
      if (scriptSpec.type == 'table') {
        file += scriptSpec.table.name + '.' + scriptSpec.table.operation + '.js';
      }
      else {
        file += scriptSpec[scriptSpec.type].name + '.js';
      }
    }

    if (fs.existsSync(file) && !force) {
      return 'File ' + file + ' already exists. Use --force to override.';
    }
    else {
      try {
        if (!output) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
        }

        fs.writeFileSync(file, script, 'utf8');
        log.info('Saved script to ' + file);
      }
      catch (e) {
        return 'Unable to save file ' + file;
      }
    }    

    return null;
  }

  var getScriptHandlers = {
    table: mobile.getTableScript,
    scheduler: mobile.getSchedulerScript,
    shared: mobile.getSharedScript
  };

  mobileScript.command('download [servicename] [scriptname]')
        .usage('[options] [servicename] [scriptname]')
        .description('Downloads mobile service script')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-p, --path <path>', 'filesystem location to save the script or scripts to; working directory by default')
        .option('-f, --file <file>', 'file to save the script to')
        .option('-o, --override', 'override existing files')
        .option('-c, --console', 'write the script to the console instead of a file')
        .execute(function (servicename, scriptname, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            scriptname ? ensuredScriptName(scriptname) : cli.prompt('Script name: ', ensuredScriptName);
            function ensuredScriptName(scriptname) {
              options.scriptname = scriptname;
              options.script = parseScriptName(options.scriptname);
              if (!options.script) {
                log.info('For table script, specify tables/<tableName>.{insert|read|update|delete}');
                log.info('For APNS script, specify shared/apnsFeedback');
                log.info('For scheduler script, specify scheduler/<scriptName>');
                return callback('Invalid script name ' + options.scriptname);
              }

              getScriptHandlers[options.script.type](options, function (error, script) {
                if (error) {
                  return callback(error);
                }

                if (options.console) {
                  console.log(script);
                }
                else {
                  callback(saveScriptFile(options.script, script, options.file, options.override));
                }
              });
            }
          }
        });

  var setScriptHandlers = {
    table: mobile.setTableScript,
    scheduler: mobile.setSchedulerScript,
    shared: mobile.setSharedScript
  };

  mobileScript.command('upload [servicename] [scriptname]')
        .usage('[options] [servicename] [scriptname]')
        .description('Uploads mobile service script')
        .option('-s, --subscription <id>', 'use the subscription id')
        .option('-f, --file <file>', 'file to read the script from')
        .execute(function (servicename, scriptname, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            scriptname ? ensuredScriptName(scriptname) : cli.prompt('Script name: ', ensuredScriptName);
            function ensuredScriptName(scriptname) {
              options.scriptname = scriptname;
              options.script = parseScriptName(options.scriptname);
              if (!options.script) {
                log.info('For table script, specify tables/<tableName>.{insert|read|update|delete}');
                log.info('For APNS script, specify shared/apnsFeedback');
                log.info('For scheduler script, specify scheduler/<scriptName>');
                return callback('Invalid script name ' + options.scriptname);
              }

              if (!options.file) {
                options.file = './' + options.script.type + '/';
                if (options.script.table) {
                  options.file += options.script.table.name + '.' + options.script.table.operation + '.js';
                }
                else {
                  options.file += options[options.script.type].name + '.js';
                }
              }

              var script;
              try {
                script = fs.readFileSync(options.file, 'utf8');
              }
              catch (e) {
                return callback('Unable to read script from file ' + options.file);
              }

              setScriptHandlers[options.script.type](options, script, callback);
            }
          }
        });

  var deleteScriptHandlers = {
    table: mobile.deleteTableScript,
    scheduler: mobile.deleteSchedulerScript,
    shared: mobile.deleteSharedScript
  };

  mobileScript.command('delete [servicename] [scriptname]')
        .usage('[options] [servicename] [scriptname]')
        .description('Deletes mobile service script or scripts')
        .option('-s, --subscription <id>', 'use the subscription id')
        .execute(function (servicename, scriptname, options, callback) {
          servicename ? ensuredServiceName(servicename) : cli.prompt('Mobile service name: ', ensuredServiceName);
          function ensuredServiceName(servicename) {
            options.servicename = servicename;
            scriptname ? ensuredScriptName(scriptname) : cli.prompt('Script name: ', ensuredScriptName);
            function ensuredScriptName(scriptname) {
              options.scriptname = scriptname;
              options.script = parseScriptName(options.scriptname);
              if (!options.script) {
                log.info('For table script, specify tables/<tableName>.{insert|read|update|delete}');
                log.info('For APNS script, specify shared/apnsFeedback');
                log.info('For scheduler script, specify scheduler/<scriptName>');
                return callback('Invalid script name ' + options.scriptname);
              }

              deleteScriptHandlers[options.script.type](options, callback);
            }
          }
        });
};