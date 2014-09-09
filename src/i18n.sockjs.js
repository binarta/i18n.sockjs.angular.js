angular.module('i18n.gateways', [])
    .factory('i18nMessageReader', ['sockJS', I18nMessageReaderFactory])
    .factory('i18nMessageWriter', ['restServiceHandler', 'topicRegistry', I18nMessageWriterFactory]);

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