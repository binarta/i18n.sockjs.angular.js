(function () {
    angular.module('i18n.gateways', ['i18n.over.sockjs'])
        .factory('i18nMessageReader', ['iosMessageReader', Wrap])
        .factory('i18nMessageWriter', ['iosMessageWriter', Wrap])
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

    function Wrap(it) {
        return it;
    }
})();
