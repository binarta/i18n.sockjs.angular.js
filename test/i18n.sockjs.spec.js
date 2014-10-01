describe('i18n.sockjs.js', function() {
    var topicRegistryMock;
    var topicMessageDispatcher;

    beforeEach(module('rest.client'));
    beforeEach(module('i18n.gateways'));
    beforeEach(module('notifications'));
    beforeEach(module('sockjs.mock'));

    beforeEach(inject(function(_topicRegistryMock_, _topicMessageDispatcher_) {
        topicRegistryMock = _topicRegistryMock_;
        topicMessageDispatcher = _topicMessageDispatcher_;
    }));

    describe('on module load', function() {
        var headers, returnedHeaders;

        it('then a default header mapper should be installed', inject(function(installRestDefaultHeaderMapper) {
            expect(installRestDefaultHeaderMapper.calls[0].args[0]).toBeDefined();
        }));

        describe('given locale is not broadcasted', function() {
            beforeEach(inject(function(installRestDefaultHeaderMapper) {
                headers = {};
                returnedHeaders = installRestDefaultHeaderMapper.calls[0].args[0](headers);
            }));

            it('then accept-language header is default', function() {
                expect(headers['accept-language']).toEqual('default');
            });

            it('then returned headers are source headers', function() {
                expect(returnedHeaders).toEqual(headers);
            });
        });

        describe('given locale is broadcasted', function() {

            beforeEach(inject(function(installRestDefaultHeaderMapper, topicRegistryMock) {
                headers = {};

                topicRegistryMock['i18n.locale']('locale');
                returnedHeaders = installRestDefaultHeaderMapper.calls[0].args[0](headers);
            }));

            it('then accept-language header is broadcasted locale', function() {
                expect(headers['accept-language']).toEqual('locale');
            });

            it('then returned headers are source headers', function() {
                expect(returnedHeaders).toEqual(headers);
            });
        });

    })

    describe('i18nMessageReader', function() {
        var reader;
        var sockJS;
        var translation;
        var status;
        var onSuccess = function(msg) {
            translation = msg;
            status = 'ok'
        };
        var onError = function() {
            status = 'error';
        };

        beforeEach(inject(function(_i18nMessageReader_, _sockJS_) {
            reader = _i18nMessageReader_;
            sockJS = _sockJS_;
            reader({namespace:'N', locale:'L', code:'C'}, onSuccess, onError);
        }));

        afterEach(function() {
            status = undefined;
            translation = undefined;
        });

        it('send a message over sockjs', function() {
            expect(sockJS.data).toEqual({
                topic:'i18n.translate',
                responseAddress: 'i18n.translated.1',
                payload: {
                    namespace:'N',
                    locale:'L',
                    key:'C'
                }
            });
        });

        it('when response is ok', function() {
            sockJS.callback()({subject:'ok', payload:{msg:'M'}});
            expect(status).toEqual('ok');
            expect(translation).toEqual('M');
        });

        it('when response is error', function() {
            sockJS.callback()({subject:'error'});
            expect(status).toEqual('error');
            expect(translation).toBeUndefined();
        });
    });

    describe('writer', function () {
        var config;
        var writer;
        var code = 'translation.code';
        var translation = 'translation message';
        var namespace = 'namespace';
        var locale = 'locale';
        var receivedSuccess;
        var receivedError;
        var receivedStatus;
        var receivedBody;
        var onSuccess = function () {
            receivedSuccess = true;
        };
        var onError = function (body, status) {
            receivedError = true;
            receivedStatus = status;
            receivedBody = body;
        };
        var context;
        var rest;
        var presenter;

        beforeEach(inject(function (i18nMessageWriter, restServiceHandler) {
            config = {};
            rest = restServiceHandler;
            writer = i18nMessageWriter;
            receivedSuccess = false;
            receivedError = false;
            context = {};
            presenter = {
                success:onSuccess
            }
        }));

        it('subscribes for config.initialized notifications', function () {
            expect(topicRegistryMock['config.initialized']).toBeDefined();
        });

        function expectRestCallFor(ctx) {
            expect(rest.calls[0].args[0].params).toEqual(ctx);
        }

        describe('given required context fields', function() {
            beforeEach(function() {
                context.key = code;
                context.message = translation;
            });

            describe('on execute', function() {
                beforeEach(function() {
                    writer(context, presenter);
                });

                it('performs rest call', function() {
                    expectRestCallFor({
                        method:'POST',
                        url:'api/i18n/translate',
                        data:{key: code, message: translation},
                        withCredentials:true
                    });
                });
            });

            describe('and optional context fields', function() {
                beforeEach(function() {
                    context.namespace = namespace;
                    context.locale = locale;
                });

                describe('on execute', function() {
                    beforeEach(function() {
                        writer(context, presenter);
                    });

                    it('performs rest call', function() {
                        expectRestCallFor({
                            method:'POST',
                            url:'api/i18n/translate',
                            data:{key: code, message: translation, namespace:namespace},
                            withCredentials:true
                        });
                    });
                });
            });
        });

        function testHttpCallsWithPrefix(prefix) {
            it('on execute', function () {
                context.key = code;
                context.message = translation;
                writer(context, {
                    success:onSuccess,
                    error:onError
                });
                expectRestCallFor({
                    method:'POST',
                    url:prefix + 'api/i18n/translate',
                    data:{key: code, message: translation},
                    withCredentials:true
                });
            });
        }

        testHttpCallsWithPrefix('');
        describe('with baseuri', function () {
            beforeEach(function () {
                config.baseUri = 'http://host/context/';
                topicRegistryMock['config.initialized'](config);
            });

            testHttpCallsWithPrefix('http://host/context/');
        });

        describe('without baseUri', function () {
            beforeEach(function () {
                topicRegistryMock['config.initialized'](config);
            });

            testHttpCallsWithPrefix('');
        });
    })
});

angular.module('sockjs.mock', [])
    .factory('sockJS', [SockJSFactory]);

function SockJSFactory() {
    var callback;
    return {
        callback: function() {return callback},
        send: function(data) {
            this.data = data;
            return {
                then: function(cb) {
                    callback = cb;
                }
            }
        }
    }
}