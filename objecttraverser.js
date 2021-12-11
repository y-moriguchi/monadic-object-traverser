/*
 * Monadic Object Traverser JS
 *
 * Copyright (c) 2021 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
(function(root) {
    function Traverser() {
        var me;

        me = {
            key: function(key) {
                return function(valid, pointer) {
                    if(!valid || pointer === null || typeof pointer !== "object") {
                        return null;
                    } else if(pointer.hasOwnProperty(key)) {
                        return {
                            valid: true,
                            pointer: pointer[key],
                            value: pointer[key]
                        };
                    } else {
                        return null;
                    }
                };
            },

            foldArray: function(exp, init, foldf) {
                return function(valid, pointer) {
                    var i,
                        valueNew = init,
                        result;

                    if(!valid || pointer === null || typeof pointer !== "object") {
                        return null;
                    } else if(typeof pointer.length !== "number") {
                        return null;
                    } else {
                        for(i = 0; i < pointer.length; i++) {
                            result = exp(valid, pointer[i]);
                            if(result === null) {
                                return null;
                            } else {
                                valueNew = foldf(valueNew, result.value);
                            }
                        }
                        return {
                            valid: true,
                            pointer: pointer,
                            value: valueNew
                        };
                    }
                };
            },

            atom: function(pred) {
                return function(valid, pointer) {
                    if(!valid || (typeof pointer === "object" && pointer !== null)) {
                        return null;
                    } else if(pred(pointer)) {
                        return {
                            valid: false,
                            pointer: null,
                            value: pointer,
                        };
                    } else {
                        return null;
                    }
                };
            },

            typeString: function() {
                return me.atom(function(x) { return typeof x === "string"; });
            },

            typeFunction: function() {
                return me.atom(function(x) { return typeof x === "function"; });
            },

            typeNumber: function() {
                return me.atom(function(x) { return typeof x === "number"; });
            },

            typeBoolean: function() {
                return me.atom(function(x) { return x === true || x === false; });
            },

            eqv: function(value) {
                return me.atom(function(x) { return x === value; });
            },

            letrec: function(/* args */) {
                var l = Array.prototype.slice.call(arguments),
                    delays = [],
                    memo = [],
                    i;

                for(i = 0; i < l.length; i++) {
                    (function(i) {
                        delays.push(function(valid, pointer) {
                            if(!memo[i]) {
                                memo[i] = l[i].apply(null, delays);
                            }
                            return memo[i](valid, pointer);
                        });
                    })(i);
                }
                return delays[0];
            },

            preserve: function(exp) {
                return me.and(exp).select(function(x) { return x; });
            },

            next: function(exp) {
                var exps = [exp],
                    me;

                function select(f) {
                    return function(valid, pointer) {
                        var i,
                            values = [],
                            result = { valid: valid, pointer: pointer };

                        for(i = 0; i < exps.length; i++) {
                            result = exps[i](result.valid, result.pointer);
                            if(result === null) {
                                return null;
                            }
                            values.push(result.value);
                        }
                        return {
                            valid: result.valid,
                            pointer: result.pointer,
                            value: f.apply(null, values)
                        };
                    };
                }

                me = {
                    next: function(exp) {
                        exps.push(exp);
                        return me;
                    },

                    select: function(f) {
                        return select(f);
                    },

                    last: function() {
                        return select(function(/* args */) {
                            return arguments[arguments.length - 1];
                        });
                    }
                };
                return me;
            },

            and: function(exp) {
                var exps = [exp],
                    me;

                function select(f) {
                    return function(valid, pointer) {
                        var i,
                            values = [],
                            result;

                        for(i = 0; i < exps.length; i++) {
                            if((result = exps[i](valid, pointer)) !== null) {
                                values.push(result.value);
                            } else {
                                return null;
                            }
                        }
                        return {
                            valid: valid,
                            pointer: pointer,
                            value: f.apply(null, values)
                        };
                    };
                }

                me = {
                    and: function(exp) {
                        exps.push(exp);
                        return me;
                    },

                    select: function(f) {
                        return select(f);
                    },

                    last: function() {
                        return select(function(/* args */) {
                            return arguments[arguments.length - 1];
                        });
                    }
                };
                return me;
            },

            choice: function(/* args */) {
                var exps = Array.prototype.slice.call(arguments);

                return function(valid, pointer) {
                    var result,
                        i;

                    for(i = 0; i < exps.length; i++) {
                        if((result = exps[i](valid, pointer)) !== null) {
                            return result;
                        }
                    }
                    return null;
                };
            },

            unit: function(value) {
                return function(valid, pointer) {
                    return {
                        valid: valid,
                        pointer: pointer,
                        value: value
                    };
                };
            },

            bind: function(exp, bindf) {
                return function(valid, pointer) {
                    var result1 = exp(valid, pointer);

                    return result1 === null ? result1 : bindf(result1.value)(result1.valid, result1.pointer);
                };
            }
        };
        return me;
    }

    if(typeof module !== "undefined" && module.exports) {
        module.exports = Traverser;
    } else {
        root["ObjectTraverser"] = Traverser;
    }
})(this);

