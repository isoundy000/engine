if (TestEditorExtends) {

    largeModule('Deserialize');

    function testWithTarget (name, testFunc) {
        test(name, function () {
            testFunc(false);
        });
        test(name + ' with target', function () {
            testFunc(true);
        });
    }

    test('basic deserialize test', function () {
        deepEqual(cc.deserialize({}), {}, 'smoke test1');
        deepEqual(cc.deserialize([]), [], 'smoke test2');

        // TODO:
        var MyAsset = (function () {
            function MyAsset () {
                this.emptyArray = [];
                this.array = [1, '2', {a:3}, [4, [5]], true];
                this.string = 'unknown';
                this.emptyString = '';
                this.number = 1;
                this.boolean = true;
                this.emptyObj = {};
                this.embeddedTypedObj = new cc.Vec2(1, 2.1);
            }
            cc.js.setClassName('MyAsset', MyAsset);
            return MyAsset;
        })();

        var asset = new MyAsset();
        var serializedAsset = Editor.serialize(asset);
        delete asset.__id__;
        var deserializedAsset = cc.deserialize(serializedAsset);

        deepEqual(deserializedAsset, asset, 'test deserialize');

        cc.js.unregisterClass(MyAsset);
    });

    test('basic deserialize test with target', function () {
        deepEqual(cc.deserialize({}, null, { target: {} }), {}, 'smoke test1');
        deepEqual(cc.deserialize([], null, { target: [] }), [], 'smoke test2');

        // TODO:
        var MyAsset = (function () {
            function MyAsset () {
                this.emptyArray = [];
                this.array = [1, '2', {a:3}, [4, [5]], true];
                this.string = 'unknown';
                this.emptyString = '';
                this.number = 1;
                this.boolean = true;
                this.emptyObj = {};
                this.embeddedTypedObj = new cc.Vec2(1, 2.1);
            }
            cc.js.setClassName('MyAsset', MyAsset);
            return MyAsset;
        })();
        var asset = new MyAsset();
        var serializedAsset = Editor.serialize(asset);
        delete asset.__id__;

        var newObj = {a:100};
        var newArray = [3, '8', newObj, [4, [9]], false];
        asset.array = newArray;

        var deserializedAsset = cc.deserialize(serializedAsset, null, {target: asset});

        strictEqual(deserializedAsset, asset, 'ref should not changed');
        strictEqual(deserializedAsset.array, newArray, 'embedded array ref should not changed');
        deepEqual(newArray, [1, '2', {a:3}, [4, [5]], true], 'embedded array should restored');
        strictEqual(deserializedAsset.array[2], newObj, 'embedded obj ref should not changed');
        deepEqual(newObj, {a:3}, 'embedded obj should restored');

        cc.js.unregisterClass(MyAsset);
    });

    test('nil', function () {
        var obj = {
            'null': null,
        };
        var str = '{ "null": null }';
        deepEqual(cc.deserialize(str), obj, 'can deserialize null');

        var MyAsset = cc.Class({
            name: 'MyAsset',
            ctor: function () {
                this.foo = 'bar';
            },
            properties: {
                nil: 1234
            }
        });

        str = '{ "__type__": "MyAsset" }';
        obj = new MyAsset();
        deepEqual(cc.deserialize(str), obj, 'use default value');

        str = '{ "__type__": "MyAsset", "nil": null }';
        obj = new MyAsset();
        obj.nil = null;
        deepEqual(cc.deserialize(str), obj, 'can override as null');

        cc.js.unregisterClass(MyAsset);
    });

    test('nil with target', function () {
        var obj = {
            'null': null,
        };
        var str = '{ "null": null }';
        deepEqual(cc.deserialize(str, null, {target: null}), obj, 'can deserialize null');
    });

    test('json deserialize test', function () {

        // TODO:
        var MyAsset = (function () {
            var _super = cc.Asset;

            function MyAsset () {
                _super.call(this);

                this.emptyArray = [];
                this.array = [1, '2', {a:3}, [4, [5]], true];
                this.string = 'unknown';
                this.number = 1;
                this.boolean = true;
                this.emptyObj = {};
                this.obj = {};

            }
            cc.js.extend(MyAsset, _super);
            cc.js.setClassName('MyAsset', MyAsset);
            return MyAsset;
        })();

        var jsonStr = '{"__type__":"MyAsset","emptyArray":[],"array":[1,"2",{"a":3},[4,[5]],true],"string":"unknown","number":1,"boolean":true,"emptyObj":{},"obj":{},"dynamicProp":false}';

        var deserializedAsset = cc.deserialize(jsonStr);

        var expectAsset = new MyAsset();

        deepEqual(deserializedAsset, expectAsset, 'json deserialize test');

        cc.js.unregisterClass(MyAsset);
    });

    test('reference to main asset', function () {
        var asset = {};
        asset.refSelf = asset;
        /*  {
                "refSelf": {
                    "__id__": 0
                }
            }
         */

        var serializedAsset = Editor.serialize(asset);
        var deserializedAsset = cc.deserialize(serializedAsset);

        ok(deserializedAsset.refSelf === deserializedAsset, 'should ref to self');
        //deepEqual(Editor.serialize(deserializedAsset), serializedAsset, 'test deserialize');
    });

    test('reference to main asset with target', function () {
        var asset = {};
        asset.refSelf = asset;
        var serializedAsset = Editor.serialize(asset);

        asset.refSelf = null;

        var deserializedAsset = cc.deserialize(serializedAsset, null, {target: asset});
        ok(deserializedAsset.refSelf === deserializedAsset, 'should ref to self');
    });

    testWithTarget('circular reference by object', function (useTarget) {
        var MyAsset = cc.Class({
            name: 'MyAsset',
            extends: cc.Asset,
            ctor: function () {
                this.refSelf = this;
                this.refToMain = null;
            },
            properties: {
                refSelf: null,
                refToMain: null
            }
        });

        var asset = new MyAsset();
        var mainAsset = { myAsset: asset };
        asset.refToMain = mainAsset;

        var serializedAsset = Editor.serialize(mainAsset);
        delete mainAsset.__id__;
        delete asset.__id__;
        var deserializedAsset = cc.deserialize(serializedAsset, null, useTarget ? {target: mainAsset} : null);

        ok(deserializedAsset.myAsset.refSelf === deserializedAsset.myAsset, 'sub asset should ref to itself');
        ok(deserializedAsset.myAsset.refToMain === deserializedAsset, 'sub asset should ref to main');

        deepEqual(deserializedAsset, mainAsset, 'can ref');

        cc.js.unregisterClass(MyAsset);
    });

    testWithTarget('circular reference by array', function (useTarget) {
        var MyAsset = (function () {
            var _super = cc.Asset;

            function MyAsset () {
                _super.call(this);
                this.array1 = [1];
                this.array2 = [this.array1, 2];
                this.array1.push(this.array2);
                // array1 = [1, array2]
                // array2 = [array1, 2]
            }
            cc.js.extend(MyAsset, _super);
            cc.js.setClassName('MyAsset', MyAsset);

            return MyAsset;
        })();

        var expectAsset = new MyAsset();
        //cc.log(Editor.serialize(expectAsset));
        var json = '[{"__type__":"MyAsset","array1":{"__id__":1},"array2":{"__id__":2}},[1,{"__id__":2}],[{"__id__":1},2]]';
        var deserializedAsset = cc.deserialize(json, null, useTarget ? {target: expectAsset} : null);

        deepEqual(deserializedAsset, expectAsset, 'two arrays can circular reference each other');
        strictEqual(deserializedAsset.array1[1][0], deserializedAsset.array1, 'two arrays can circular reference each other 1');
        strictEqual(deserializedAsset.array2[0][1], deserializedAsset.array2, 'two arrays can circular reference each other 2');

        cc.js.unregisterClass(MyAsset);
    });

    testWithTarget('circular reference by dict', function (useTarget) {
        var MyAsset = (function () {
            var _super = cc.Asset;

            function MyAsset () {
                _super.call(this);
                this.dict1 = {num: 1};
                this.dict2 = {num: 2, other: this.dict1};
                this.dict1.other = this.dict2;
            }
            cc.js.extend(MyAsset, _super);
            cc.js.setClassName('MyAsset', MyAsset);

            return MyAsset;
        })();
        var expectAsset = new MyAsset();

        var serializedAssetJson = '[{"__type__":"MyAsset","dict1":{"__id__":1},"dict2":{"__id__":2}},{"num":1,"other":{"__id__":2}},{"num":2,"other":{"__id__":1}}]';
        var deserializedAsset = cc.deserialize(serializedAssetJson, null, useTarget ? {target: expectAsset} : null);

        deepEqual(deserializedAsset, expectAsset, 'two dicts can circular reference each other');
        strictEqual(deserializedAsset.dict1.other.other, deserializedAsset.dict1, 'two dicts can circular reference each other 1');
        strictEqual(deserializedAsset.dict2.other.other, deserializedAsset.dict2, 'two dicts can circular reference each other 2');

        cc.js.unregisterClass(MyAsset);
    });

    test('target', function () {
        var MyAsset = cc.Class({
            name: 'MyAsset',
            ctor: function () {
                this.tmpVal = 0;
            },
            properties: {
                saveVal: 0
            }
        });

        var myAsset = new MyAsset();
        myAsset.tmpVal = 321;
        myAsset.saveVal = 111;
        var data = Editor.serialize(myAsset);
        myAsset.saveVal = 0;

        var newAsset = cc.deserialize(data, null, { target:myAsset });

        strictEqual(newAsset, myAsset, 'target reference not changed');
        strictEqual(myAsset.tmpVal, 321, 'tmp member of target not changed');
        strictEqual(myAsset.saveVal, 111, 'serialized member of target reloaded');

        cc.js.unregisterClass(MyAsset);
    });

    test('custom deserialization', function () {
        var Asset = cc.Class({
            name: 'a a b b',
            extend: cc.Object,
            properties: {
                prop1: 1,
                prop2: 2
            },
            _serialize: function () {
                return [this.prop1, this.prop2];
            },
            _deserialize: function (data) {
                this.prop1 = data[0];
                this.prop2 = data[1];
            }
        });
        var a = new Asset();
        var sa = Editor.serialize(a, { stringify: false });
        deepEqual(sa.content, [1, 2], 'should pack value to array');

        var da = cc.deserialize(sa);
        strictEqual(da.prop1, 1, 'can extract packed value 1');
        strictEqual(da.prop2, 2, 'can extract packed value 2');

        cc.js.unregisterClass(Asset);
    });
}