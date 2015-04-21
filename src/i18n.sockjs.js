angular.module('i18n.gateways', ['binarta.sockjs', 'config', 'rest.client', 'notifications'])
    .factory('i18nMessageReader', ['sockJS', I18nMessageReaderFactory])
    .factory('i18nMessageWriter', ['config', 'restServiceHandler', I18nMessageWriterFactory])
    .run(['installRestDefaultHeaderMapper', 'topicRegistry', function(installRestDefaultHeaderMapper, topicRegistry) {
        var locale = 'default';
        topicRegistry.subscribe('i18n.locale', function(msg) {
            locale = msg;
        });
        installRestDefaultHeaderMapper(function(headers) {
            if (!headers['accept-language']) headers['accept-language'] = locale;
            return headers;
        })
    }]);

function I18nMessageReaderFactory(sockJS) {
    var counter = 0;
    return function(ctx, onSuccess, onError) {
        var handlers = {
            ok: function(data) {
                onSuccess(data.payload.msg)
            }
        };
        sockJS.send({
            topic:'i18n.translate',
            responseAddress:'i18n.translated.'+(++counter),
            payload:{namespace:ctx.namespace, locale:ctx.locale, key:ctx.code}
        }).then(function(data) {
            var handler = handlers[data.subject] || onError;
            handler(data);
        })
    }
}

function I18nMessageWriterFactory(config, restServiceHandler) {
    return function (ctx, presenter) {
        var payload = {
            key: ctx.key,
            message: ctx.message
        };
        if (ctx.namespace) payload.namespace = ctx.namespace;

        presenter.params = {
            method: 'POST',
            url: (config.baseUri || '') + 'api/i18n/translate',
            data: payload,
            withCredentials: true
        };
        if (ctx.locale) presenter.params.headers = {'accept-language': ctx.locale};
        restServiceHandler(presenter);
    }
}