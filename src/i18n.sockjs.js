angular.module('i18n.gateways', [])
    .factory('i18nMessageReader', ['sockJS', 'ngRegisterTopicHandler', I18nMessageReaderFactory])
    .factory('i18nMessageWriter', ['restServiceHandler', 'topicRegistry', I18nMessageWriterFactory]);

function I18nMessageReaderFactory(sockJS, ngRegisterTopicHandler) {
    return function(ctx, onSuccess, onError) {
        var handlers = {
            ok: function(data) {
                onSuccess(data.payload.msg)
            }
        };
        ngRegisterTopicHandler(ctx, 'i18n.translated.'+ctx.code, function(data) {
            var handler = handlers[data.subject] || onError;
            handler(data);
        });
        ngRegisterTopicHandler(ctx, 'sockjs.loaded', function() {
            sockJS.send({
                topic:'i18n.translate',
                responseAddress:'i18n.translated.'+ctx.code,
                payload:{namespace:ctx.namespace, locale:ctx.locale, key:ctx.code}
            })
        })
    }
}

function I18nMessageWriterFactory(restServiceHandler, topicRegistry) {
    var baseUri = '';
    topicRegistry.subscribe('config.initialized', function (config) {
        baseUri = config.baseUri || '';
    });

    return function (ctx, presenter) {
        var payload = {
            key: ctx.key,
            message: ctx.message
        };
        if (ctx.namespace) payload.namespace = ctx.namespace;

        presenter.params = {
            method: 'POST',
            url: baseUri + 'api/i18n/translate',
            data: payload,
            withCredentials: true
        };
        restServiceHandler(presenter);
    }
}