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

        describe('on sockjs.loaded', function() {
            beforeEach(function() {
                topicRegistryMock['sockjs.loaded']('ok');
            });

            it('send a message over sockjs', function() {
                expect(sockJS.data).toEqual({
                    topic:'i18n.translate',
                    responseAddress: 'i18n.translated.C',
                    payload: {
                        namespace:'N',
                        locale:'L',
                        key:'C'
                    }
                });
            })
        });

        describe('on i18n.translated', function() {
            describe('with ok', function() {
                beforeEach(function() {
                    topicRegistryMock['i18n.translated.C']({subject:'ok', payload:{msg:'M'}})
                });

                it('success handler is called with translation', function() {
                    expect(status).toEqual('ok');
                    expect(translation).toEqual('M');
                })
            });

            describe('with error', function() {
                beforeEach(function() {
                    topicRegistryMock['i18n.translated.C']({subject:'error'});
                });

                it('error handler is called', function() {
                    expect(status).toEqual('error');
                    expect(translation).toBeUndefined();
                })
            });
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
    return {
        send: function(data) {
            this.data = data;
        }
    }
}