/*
 * Monadic Object Traverser JS
 *
 * Copyright (c) 2021 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
/*
 * This test case describe for Jasmine.
 */
describe("Monadic Object Traverser", function () {
    function match(exp, hashtable, valid, pointer, value) {
        var result = exp(true, hashtable, 0);

        expect(result.valid).toBe(valid);
        if(valid) {
            expect(result.pointer).toBe(pointer);
        }
        expect(result.value).toBe(value);
    }

    function nomatch(exp, hashtable) {
        var result = exp(true, hashtable, 0);

        expect(result).toBeNull();
    }

    function nomatchInvalid(exp, hashtable) {
        var result = exp(false, null, 0);

        expect(result).toBeNull();
    }

    beforeEach(function () {
    });

    describe("testing match", function () {
        it("key", function () {
            var H = ObjectTraverser(),
                ht = { key: { sub: 1 } };

            match(H.key("key"), ht, true, ht.key, ht.key);
            nomatch(H.key("key"), { nkey: 1 });
            nomatch(H.key("key"), 1);
            nomatch(H.key("key"), "aaa");
            nomatch(H.key("key"), function() {});
            nomatch(H.key("key"), true);
            nomatch(H.key("key"), false);
            nomatch(H.key("key"), null);
            nomatchInvalid(H.key("key"));
        });

        it("foldArray", function () {
            var H = ObjectTraverser(),
                ht1 = [ 1, 2, 3 ],
                ht2 = [];

            match(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), ht1, true, ht1, 6);
            match(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), ht2, true, ht2, 0);
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), [ 1, 2, null ]);
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), { nkey: 1 });
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), 1);
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), "aaa");
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), function() {});
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), true);
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), false);
            nomatch(H.foldArray(H.typeNumber(), 0, function(x, y) { return x + y; }), null);
            nomatchInvalid(H.foldArray(H.typeNumber()));
        });

        it("atom", function () {
            var H = ObjectTraverser();

            match(H.atom(function(x) { return x === 1; }), 1, false, null, 1);
            nomatch(H.atom(function(x) { return x === 1; }), [ 1, 2, null ]);
            nomatch(H.atom(function(x) { return x === 1; }), { nkey: 1 });
            nomatch(H.atom(function(x) { return x === 1; }), 2);
            nomatch(H.atom(function(x) { return x === 1; }), "aaa");
            nomatch(H.atom(function(x) { return x === 1; }), function() {});
            nomatch(H.atom(function(x) { return x === 1; }), true);
            nomatch(H.atom(function(x) { return x === 1; }), false);
            nomatch(H.atom(function(x) { return x === 1; }), null);
            nomatchInvalid(H.atom(function(x) { return x === 1; }));
        });

        it("preserve", function () {
            var H = ObjectTraverser();

            match(H.preserve(H.typeNumber()), 1, true, 1, 1);
            nomatch(H.preserve(H.typeNumber()), "aaa");
        });

        it("next", function () {
            var H = ObjectTraverser(),
                rule = H.next(H.key("key")).next(H.typeNumber()).select(function(x, y) { return y; });

            match(rule, { "key": 1 }, false, null, 1);
            nomatch(rule, { "nkey": 1 });
            nomatch(rule, { "key": "aaa" });
        });

        it("and", function () {
            var H = ObjectTraverser(),
                rule = H.and(H.key("key")).and(H.key("key2")).select(function(x, y) { return x - y; })
                ht1 = { "key": 1, "key2": 2 };

            match(rule, ht1, true, ht1, -1);
            nomatch(rule, { "key": 1, "nkey": 1 });
            nomatch(rule, { "key3": 1, "key2": 1 });
        });

        it("choice", function () {
            var H = ObjectTraverser(),
                ht1 = { "key": 1, "key2": 2 },
                ht2 = { "key": 1, "key3": 2 },
                ht3 = { "key3": 1, "key2": 2 };

            match(H.choice(H.key("key"), H.key("key2")), ht1, true, 1, 1);
            match(H.choice(H.key("key"), H.key("key2")), ht2, true, 1, 1);
            match(H.choice(H.key("key"), H.key("key2")), ht3, true, 2, 2);
            nomatch(H.choice(H.key("key"), H.key("key2")), { "key3": 1, "key4": 1 });
        });

        it("unit", function () {
            var H = ObjectTraverser();

            match(H.unit(123), 1, true, 1, 123);
        });

        it("bind", function () {
            var H = ObjectTraverser(),
                rule = H.bind(H.and(H.next(H.key("key1")).next(H.typeNumber()).last()).last(),
                              x => H.next(H.key("key2")).next(H.eqv(x)).last());

            match(rule, { "key1": 123, "key2": 123 }, false, null, 123);
            nomatch(rule, { "key1": 123, "key2": 666 });
            nomatch(rule, { "key": 123, "key2": 123 });
            nomatch(rule, { "key1": 123, "key": 123 });
        });

        it("monad rules", function () {
            var H = ObjectTraverser(),
                object3 = { "key0": 123, "key1": 123, "key2": 246 };

            function rule1(x) {
                return H.next(H.key("key1")).next(H.eqv(x)).last();
            }

            function rule31(x) {
                return H.preserve(H.next(H.key("key1")).next(H.eqv(x)).select(function(x, y) { return y * 2; }));
            }

            function rule32(x) {
                return H.next(H.key("key2")).next(H.eqv(x)).last();
            }

            function rule33(x) {
                return H.bind(H.preserve(H.next(H.key("key1")).next(H.eqv(x)).select(function(x, y) { return y * 2; })),
                              function(y) { return H.next(H.key("key2")).next(H.eqv(y)).last(); });
            }

            match(H.bind(H.unit(123), rule1), { "key1": 123 }, false, null, 123);
            match(rule1(123), { "key1": 123 }, false, null, 123);
            match(H.bind(H.key("key1"), H.unit), { "key1": 123 }, true, 123, 123);
            match(H.key("key1"), { "key1": 123 }, true, 123, 123);
            match(H.bind(H.preserve(H.key("key0")), rule33), object3, false, null, 246);
            match(H.bind(H.bind(H.preserve(H.key("key0")), rule31), rule32), object3, false, null, 246);
        });

        it("action, letrec", function () {
            var H = ObjectTraverser(),
                trav = H.letrec(function(trav, leaf) {
                    function makeT(node, f) {
                        return H.and(H.next(H.key("type")).next(H.eqv(node)).select(function() { return null; }))
                            .and(H.next(H.key("left")).next(trav).last())
                            .and(H.next(H.key("right")).next(trav).last())
                            .select(f);
                    };

                    return H.choice(
                        leaf,
                        makeT("+", function(a, b, c) { return b + c; }),
                        makeT("-", function(a, b, c) { return b - c; }),
                        makeT("*", function(a, b, c) { return b * c; }),
                        makeT("/", function(a, b, c) { return b / c; }));
                }, function(trav, leaf) {
                    return H.typeNumber();
                }),
                dest = {
                    type: "-",
                    left: 2,
                    right: {
                        type: "*",
                        left: 3,
                        right: 4
                    }
                };

            match(trav, dest, true, dest, -10);
        });
    });
});
