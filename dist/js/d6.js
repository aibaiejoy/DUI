//     Underscore.js 1.8.2
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind,
    nativeCreate       = Object.create;

  // Naked function reference for surrogate-prototype-swapping.
  var Ctor = function(){};

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.8.2';

  // Internal function that returns an efficient (for current engines) version
  // of the passed-in callback, to be repeatedly applied in other Underscore
  // functions.
  var optimizeCb = function(func, context, argCount) {
    if (context === void 0) return func;
    switch (argCount == null ? 3 : argCount) {
      case 1: return function(value) {
        return func.call(context, value);
      };
      case 2: return function(value, other) {
        return func.call(context, value, other);
      };
      case 3: return function(value, index, collection) {
        return func.call(context, value, index, collection);
      };
      case 4: return function(accumulator, value, index, collection) {
        return func.call(context, accumulator, value, index, collection);
      };
    }
    return function() {
      return func.apply(context, arguments);
    };
  };

  // A mostly-internal function to generate callbacks that can be applied
  // to each element in a collection, returning the desired result — either
  // identity, an arbitrary callback, a property matcher, or a property accessor.
  var cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // An internal function for creating assigner functions.
  var createAssigner = function(keysFunc, undefinedOnly) {
    return function(obj) {
      var length = arguments.length;
      if (length < 2 || obj == null) return obj;
      for (var index = 1; index < length; index++) {
        var source = arguments[index],
            keys = keysFunc(source),
            l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i];
          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
        }
      }
      return obj;
    };
  };

  // An internal function for creating a new object that inherits from another.
  var baseCreate = function(prototype) {
    if (!_.isObject(prototype)) return {};
    if (nativeCreate) return nativeCreate(prototype);
    Ctor.prototype = prototype;
    var result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  // Helper for collection methods to determine whether a collection
  // should be iterated as an array or as an object
  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
  var isArrayLike = function(collection) {
    var length = collection != null && collection.length;
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles raw objects in addition to array-likes. Treats all
  // sparse array-likes as if they were dense.
  _.each = _.forEach = function(obj, iteratee, context) {
    iteratee = optimizeCb(iteratee, context);
    var i, length;
    if (isArrayLike(obj)) {
      for (i = 0, length = obj.length; i < length; i++) {
        iteratee(obj[i], i, obj);
      }
    } else {
      var keys = _.keys(obj);
      for (i = 0, length = keys.length; i < length; i++) {
        iteratee(obj[keys[i]], keys[i], obj);
      }
    }
    return obj;
  };

  // Return the results of applying the iteratee to each element.
  _.map = _.collect = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length,
        results = Array(length);
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      results[index] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // Create a reducing function iterating left or right.
  function createReduce(dir) {
    // Optimized iterator function as using arguments.length
    // in the main function will deoptimize the, see #1991.
    function iterator(obj, iteratee, memo, keys, index, length) {
      for (; index >= 0 && index < length; index += dir) {
        var currentKey = keys ? keys[index] : index;
        memo = iteratee(memo, obj[currentKey], currentKey, obj);
      }
      return memo;
    }

    return function(obj, iteratee, memo, context) {
      iteratee = optimizeCb(iteratee, context, 4);
      var keys = !isArrayLike(obj) && _.keys(obj),
          length = (keys || obj).length,
          index = dir > 0 ? 0 : length - 1;
      // Determine the initial value if none is provided.
      if (arguments.length < 3) {
        memo = obj[keys ? keys[index] : index];
        index += dir;
      }
      return iterator(obj, iteratee, memo, keys, index, length);
    };
  }

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`.
  _.reduce = _.foldl = _.inject = createReduce(1);

  // The right-associative version of reduce, also known as `foldr`.
  _.reduceRight = _.foldr = createReduce(-1);

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var key;
    if (isArrayLike(obj)) {
      key = _.findIndex(obj, predicate, context);
    } else {
      key = _.findKey(obj, predicate, context);
    }
    if (key !== void 0 && key !== -1) return obj[key];
  };

  // Return all the elements that pass a truth test.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    predicate = cb(predicate, context);
    _.each(obj, function(value, index, list) {
      if (predicate(value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, _.negate(cb(predicate)), context);
  };

  // Determine whether all of the elements match a truth test.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (!predicate(obj[currentKey], currentKey, obj)) return false;
    }
    return true;
  };

  // Determine if at least one element in the object matches a truth test.
  // Aliased as `any`.
  _.some = _.any = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = !isArrayLike(obj) && _.keys(obj),
        length = (keys || obj).length;
    for (var index = 0; index < length; index++) {
      var currentKey = keys ? keys[index] : index;
      if (predicate(obj[currentKey], currentKey, obj)) return true;
    }
    return false;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `includes` and `include`.
  _.contains = _.includes = _.include = function(obj, target, fromIndex) {
    if (!isArrayLike(obj)) obj = _.values(obj);
    return _.indexOf(obj, target, typeof fromIndex == 'number' && fromIndex) >= 0;
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      var func = isFunc ? method : value[method];
      return func == null ? func : func.apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matcher(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matcher(attrs));
  };

  // Return the maximum element (or element-based computation).
  _.max = function(obj, iteratee, context) {
    var result = -Infinity, lastComputed = -Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value > result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iteratee, context) {
    var result = Infinity, lastComputed = Infinity,
        value, computed;
    if (iteratee == null && obj != null) {
      obj = isArrayLike(obj) ? obj : _.values(obj);
      for (var i = 0, length = obj.length; i < length; i++) {
        value = obj[i];
        if (value < result) {
          result = value;
        }
      }
    } else {
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index, list) {
        computed = iteratee(value, index, list);
        if (computed < lastComputed || computed === Infinity && result === Infinity) {
          result = value;
          lastComputed = computed;
        }
      });
    }
    return result;
  };

  // Shuffle a collection, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var set = isArrayLike(obj) ? obj : _.values(obj);
    var length = set.length;
    var shuffled = Array(length);
    for (var index = 0, rand; index < length; index++) {
      rand = _.random(0, index);
      if (rand !== index) shuffled[index] = shuffled[rand];
      shuffled[rand] = set[index];
    }
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (!isArrayLike(obj)) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // Sort the object's values by a criterion produced by an iteratee.
  _.sortBy = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iteratee(value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iteratee, context) {
      var result = {};
      iteratee = cb(iteratee, context);
      _.each(obj, function(value, index) {
        var key = iteratee(value, index, obj);
        behavior(result, value, key);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, value, key) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, value, key) {
    if (_.has(result, key)) result[key]++; else result[key] = 1;
  });

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (isArrayLike(obj)) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
  };

  // Split a collection into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var pass = [], fail = [];
    _.each(obj, function(value, key, obj) {
      (predicate(value, key, obj) ? pass : fail).push(value);
    });
    return [pass, fail];
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, strict, startIndex) {
    var output = [], idx = 0;
    for (var i = startIndex || 0, length = input && input.length; i < length; i++) {
      var value = input[i];
      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
        //flatten current level of array or arguments object
        if (!shallow) value = flatten(value, shallow, strict);
        var j = 0, len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        output[idx++] = value;
      }
    }
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    if (array == null) return [];
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }
    if (iteratee != null) iteratee = cb(iteratee, context);
    var result = [];
    var seen = [];
    for (var i = 0, length = array.length; i < length; i++) {
      var value = array[i],
          computed = iteratee ? iteratee(value, i, array) : value;
      if (isSorted) {
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        result.push(value);
      }
    }
    return result;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(flatten(arguments, true, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    if (array == null) return [];
    var result = [];
    var argsLength = arguments.length;
    for (var i = 0, length = array.length; i < length; i++) {
      var item = array[i];
      if (_.contains(result, item)) continue;
      for (var j = 1; j < argsLength; j++) {
        if (!_.contains(arguments[j], item)) break;
      }
      if (j === argsLength) result.push(item);
    }
    return result;
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = flatten(arguments, true, true, 1);
    return _.filter(array, function(value){
      return !_.contains(rest, value);
    });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    return _.unzip(arguments);
  };

  // Complement of _.zip. Unzip accepts an array of arrays and groups
  // each array's elements on shared indices
  _.unzip = function(array) {
    var length = array && _.max(array, 'length').length || 0;
    var result = Array(length);

    for (var index = 0; index < length; index++) {
      result[index] = _.pluck(array, index);
    }
    return result;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    var result = {};
    for (var i = 0, length = list && list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // Return the position of the first occurrence of an item in an array,
  // or -1 if the item is not included in the array.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    var i = 0, length = array && array.length;
    if (typeof isSorted == 'number') {
      i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
    } else if (isSorted && length) {
      i = _.sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
    if (item !== item) {
      return _.findIndex(slice.call(array, i), _.isNaN);
    }
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  _.lastIndexOf = function(array, item, from) {
    var idx = array ? array.length : 0;
    if (typeof from == 'number') {
      idx = from < 0 ? idx + from + 1 : Math.min(idx, from + 1);
    }
    if (item !== item) {
      return _.findLastIndex(slice.call(array, 0, idx), _.isNaN);
    }
    while (--idx >= 0) if (array[idx] === item) return idx;
    return -1;
  };

  // Generator function to create the findIndex and findLastIndex functions
  function createIndexFinder(dir) {
    return function(array, predicate, context) {
      predicate = cb(predicate, context);
      var length = array != null && array.length;
      var index = dir > 0 ? 0 : length - 1;
      for (; index >= 0 && index < length; index += dir) {
        if (predicate(array[index], index, array)) return index;
      }
      return -1;
    };
  }

  // Returns the first index on an array-like that passes a predicate test
  _.findIndex = createIndexFinder(1);

  _.findLastIndex = createIndexFinder(-1);

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iteratee, context) {
    iteratee = cb(iteratee, context, 1);
    var value = iteratee(obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = Math.floor((low + high) / 2);
      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
    }
    return low;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = step || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var range = Array(length);

    for (var idx = 0; idx < length; idx++, start += step) {
      range[idx] = start;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Determines whether to execute a function as a constructor
  // or a normal function with the provided arguments
  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
    var self = baseCreate(sourceFunc.prototype);
    var result = sourceFunc.apply(self, args);
    if (_.isObject(result)) return result;
    return self;
  };

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
    var args = slice.call(arguments, 2);
    var bound = function() {
      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
    };
    return bound;
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    var bound = function() {
      var position = 0, length = boundArgs.length;
      var args = Array(length);
      for (var i = 0; i < length; i++) {
        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return executeBound(func, bound, this, this, args);
    };
    return bound;
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var i, length = arguments.length, key;
    if (length <= 1) throw new Error('bindAll must be passed function names');
    for (i = 1; i < length; i++) {
      key = arguments[i];
      obj[key] = _.bind(obj[key], obj);
    }
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memoize = function(key) {
      var cache = memoize.cache;
      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
      return cache[address];
    };
    memoize.cache = {};
    return memoize;
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){
      return func.apply(null, args);
    }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = _.partial(_.delay, _, 1);

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          if (!timeout) context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) timeout = setTimeout(later, wait);
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a negated version of the passed-in predicate.
  _.negate = function(predicate) {
    return function() {
      return !predicate.apply(this, arguments);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var args = arguments;
    var start = args.length - 1;
    return function() {
      var i = start;
      var result = args[start].apply(this, arguments);
      while (i--) result = args[i].call(this, result);
      return result;
    };
  };

  // Returns a function that will only be executed on and after the Nth call.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Returns a function that will only be executed up to (but not including) the Nth call.
  _.before = function(times, func) {
    var memo;
    return function() {
      if (--times > 0) {
        memo = func.apply(this, arguments);
      }
      if (times <= 1) func = null;
      return memo;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = _.partial(_.before, 2);

  // Object Functions
  // ----------------

  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  function collectNonEnumProps(obj, keys) {
    var nonEnumIdx = nonEnumerableProps.length;
    var constructor = obj.constructor;
    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // Constructor is a special case.
    var prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // Retrieve the names of an object's own properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve all the property names of an object.
  _.allKeys = function(obj) {
    if (!_.isObject(obj)) return [];
    var keys = [];
    for (var key in obj) keys.push(key);
    // Ahem, IE < 9.
    if (hasEnumBug) collectNonEnumProps(obj, keys);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Returns the results of applying the iteratee to each element of the object
  // In contrast to _.map it returns an object
  _.mapObject = function(obj, iteratee, context) {
    iteratee = cb(iteratee, context);
    var keys =  _.keys(obj),
          length = keys.length,
          results = {},
          currentKey;
      for (var index = 0; index < length; index++) {
        currentKey = keys[index];
        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
      }
      return results;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = createAssigner(_.allKeys);

  // Assigns a given object with all the own properties in the passed-in object(s)
  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
  _.extendOwn = _.assign = createAssigner(_.keys);

  // Returns the first key on an object that passes a predicate test
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    var keys = _.keys(obj), key;
    for (var i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(object, oiteratee, context) {
    var result = {}, obj = object, iteratee, keys;
    if (obj == null) return result;
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      keys = flatten(arguments, false, false, 1);
      iteratee = function(value, key, obj) { return key in obj; };
      obj = Object(obj);
    }
    for (var i = 0, length = keys.length; i < length; i++) {
      var key = keys[i];
      var value = obj[key];
      if (iteratee(value, key, obj)) result[key] = value;
    }
    return result;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      var keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // Fill in a given object with default properties.
  _.defaults = createAssigner(_.allKeys, true);

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  _.create = function(prototype, props) {
    var result = baseCreate(prototype);
    if (props) _.extendOwn(result, props);
    return result;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Returns whether an object has a given set of `key:value` pairs.
  _.isMatch = function(object, attrs) {
    var keys = _.keys(attrs), length = keys.length;
    if (object == null) return !length;
    var obj = Object(object);
    for (var i = 0; i < length; i++) {
      var key = keys[i];
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };


  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a === 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
      case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return '' + a === '' + b;
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive.
        // Object(NaN) is equivalent to NaN
        if (+a !== +a) return +b !== +b;
        // An `egal` comparison is performed for other numeric values.
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a === +b;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
                               _.isFunction(bCtor) && bCtor instanceof bCtor)
                          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    
    // Initializing stack of traversed objects.
    // It's done here since we only need them for objects and arrays comparison.
    aStack = aStack || [];
    bStack = bStack || [];
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) return bStack[length] === b;
    }

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // Deep compare objects.
      var keys = _.keys(a), key;
      length = keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (_.keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = keys[length];
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return true;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
    return _.keys(obj).length === 0;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE < 9), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return _.has(obj, 'callee');
    };
  }

  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
  // IE 11 (#1621), and in Safari 8 (#1929).
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iteratees.
  _.identity = function(value) {
    return value;
  };

  // Predicate-generating functions. Often useful outside of Underscore.
  _.constant = function(value) {
    return function() {
      return value;
    };
  };

  _.noop = function(){};

  _.property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Generates a function for a given object that returns a given property.
  _.propertyOf = function(obj) {
    return obj == null ? function(){} : function(key) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of 
  // `key:value` pairs.
  _.matcher = _.matches = function(attrs) {
    attrs = _.extendOwn({}, attrs);
    return function(obj) {
      return _.isMatch(obj, attrs);
    };
  };

  // Run a function **n** times.
  _.times = function(n, iteratee, context) {
    var accum = Array(Math.max(0, n));
    iteratee = optimizeCb(iteratee, context, 1);
    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() {
    return new Date().getTime();
  };

   // List of HTML entities for escaping.
  var escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;'
  };
  var unescapeMap = _.invert(escapeMap);

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  var createEscaper = function(map) {
    var escaper = function(match) {
      return map[match];
    };
    // Regexes for identifying a key that needs to be escaped
    var source = '(?:' + _.keys(map).join('|') + ')';
    var testRegexp = RegExp(source);
    var replaceRegexp = RegExp(source, 'g');
    return function(string) {
      string = string == null ? '' : '' + string;
      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
    };
  };
  _.escape = createEscaper(escapeMap);
  _.unescape = createEscaper(unescapeMap);

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property, fallback) {
    var value = object == null ? void 0 : object[property];
    if (value === void 0) {
      value = fallback;
    }
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

  var escapeChar = function(match) {
    return '\\' + escapes[match];
  };

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  // NB: `oldSettings` only exists for backwards compatibility.
  _.template = function(text, settings, oldSettings) {
    if (!settings && oldSettings) settings = oldSettings;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset).replace(escaper, escapeChar);
      index = offset + match.length;

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      } else if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      } else if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }

      // Adobe VMs need the match returned to produce the correct offest.
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + 'return __p;\n';

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled source as a convenience for precompilation.
    var argument = settings.variable || 'obj';
    template.source = 'function(' + argument + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function. Start chaining a wrapped Underscore object.
  _.chain = function(obj) {
    var instance = _(obj);
    instance._chain = true;
    return instance;
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(instance, obj) {
    return instance._chain ? _(obj).chain() : obj;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    _.each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result(this, func.apply(_, args));
      };
    });
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
      return result(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  _.each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result(this, method.apply(this._wrapped, arguments));
    };
  });

  // Extracts the result from a wrapped and chained object.
  _.prototype.value = function() {
    return this._wrapped;
  };

  // Provide unwrapping proxy for some methods used in engine operations
  // such as arithmetic and JSON stringification.
  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;
  
  _.prototype.toString = function() {
    return '' + this._wrapped;
  };

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}.call(this));


;
(function(global, $, undefined) {
	var d6 = {
			verticalSwipe: true //是否可以纵向滑动
		},
		$ui = {},
		Base = {},
		readyRE = /complete|loaded|interactive/,
		REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g,
		SLASH_RE = /\\\\/g;

	Base.eachObj = function(obj, iterator) {
		obj && Object.keys(obj).forEach(function(key) {
			iterator(key, obj[key]);
		});
	};
	Base.getWidget = function(name) {
		return $ui.widgets[name]
	};
	Base.register = function(name, callback) {
		if ($.isFunction(callback)) {
			callback.call(global, $ui.plugins[name])
		}
	};
	Base.init = function() {};
	/**
	 * @name extend
	 * @desc 扩充现有组件
	 */
	Base.extend = function(obj) {
		var proto = this.prototype;
		Base.eachObj(obj, function(key, val) {
			proto[key] = val;
		});
		return this;
	};

	Base.parseTpl = function(str, data) {
		console.log("Base.parseTpl 已过期")
		var tmpl = 'var __p=[];' + 'with(obj||{}){__p.push(\'' +
			str.replace(/\\/g, '\\\\')
			.replace(/'/g, '\\\'')
			.replace(/<%=([\s\S]+?)%>/g, function(match, code) {
				return '\',' + code.replace(/\\'/, '\'') + ',\'';
			})
			.replace(/<%([\s\S]+?)%>/g, function(match, code) {
				return '\');' + code.replace(/\\'/, '\'')
					.replace(/[\r\n\t]/g, ' ') + '__p.push(\'';
			})
			.replace(/\r/g, '\\r')
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t') +
			'\');}return __p.join("");',

			func = new Function('obj', tmpl);

		return data ? func(data) : func;
	};

	$ui.uuid = 0;
	$ui.data = {};
	$ui.widgets = {};
	$ui.plugins = {};
	$ui.module = {};

	$ui.define = function(name, options) {
		if ($ui.widgets[name]) return $ui.widgets[name];
		var defOpts = {
			/**
			 * 参照对象
			 * @property {String} [ref=null]
			 */
			ref: null, //参照目标 

			/**
			 * 点击回调函数
			 * @type {function}
			 */
			callback: null
		}
		var klass = function(opts) {
			var baseOpts = $.extend(true, {}, this.options);
			this.opts = $.extend(true, baseOpts, opts);
			this.ref = $(this.opts.ref);
			this.callback = this.opts.callback;
			this.$family = {
				name: name
			}
			this.init();
		}
		
		$.extend(klass.prototype , Base);
		//$ui.widgets[name] = Base.extend.call(klass, Base);
		//$.extend(klass.prototype.options || {}, defOpts, options);
		klass.prototype.options = $.extend(defOpts, options);
		
		return $ui.widgets[name] = klass;
	};

	$ui.plugin = function(name, factory) {
		$ui.plugins[name] = factory
	};

	var define = function(factory) {
		if ($.isFunction(factory)) {
			var module = factory.call(global, $ui)
		}
	};

	var require = function(widget) {
		var widget = Base.getWidget(widget);
		return widget;
	}

	global.define = define;
	global.d6 = d6;

	/*
		@author 李光
	    判断是否Touch屏幕
	*/
	var isTouchScreen = Base.isTouchScreen = (function() {
		return (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
	})();
	
	Base.touchEve = (function() {
		return isTouchScreen ? "tap" : "click"
	})();

	Base.touchStart = (function() {
		return isTouchScreen ? "touchstart" : "mousedown"
	})();

	Base.touchEnd = (function() {
		return isTouchScreen ? "touchend" : "mouseup mouseout"
	})();

	Base.touchCancel = (function() {
		return isTouchScreen ? "touchcancel" : "mouseup"
	})();

	Base.touchMove = (function() {
		return isTouchScreen ? "touchmove" : "mousemove"
	})();

	Base.longTap = (function() {
		return isTouchScreen ? "longTap" : "mouseup"
	})();

	Base.touchOver = (function() {
		return isTouchScreen ? "touchend touchmove" : "mouseup"
	})();


	var initializing = false,
		fnTest = /xyz/.test(function() {
			xyz;
		}) ? /\b_super\b/ : /.*/;

	var Class = function() {};

	Class.extend = function(prop) {
		var _super = this.prototype;
		initializing = true;
		var prototype = new this();
		initializing = false;
	
		for (var name in prop) {
			prototype[name] = typeof prop[name] == "function" &&
				typeof _super[name] == "function" && fnTest.test(prop[name]) ?
				(function(name, fn) {
					return function() {
						var tmp = this._super;

						this._super = _super[name];

						var ret = fn.apply(this, arguments);
						this._super = tmp;

						return ret;
					};
				})(name, prop[name]) :
				prop[name];
		}
		function Child() {
			if (!initializing && this.init)
				this.init.apply(this, arguments);
		}
		Child.prototype = prototype;
		Child.prototype.constructor = Child;
		Child.extend = arguments.callee;
		return Child;
	};
	//扩展Class
	Class = Class.extend(Base);
	Class = Class.extend(_);

	$.Class = Class;
	
	$.namespace = 'ui';
	$.classNamePrefix = $.namespace + '-';
	$.classSelectorPrefix = '.' + $.classNamePrefix;
	/**
	 * 返回正确的className
	 * @param {type} className
	 * @returns {String}
	 */
	$.className = function(className) {
		return $.classNamePrefix + className;
	};
	
	/**
	 * trigger event
	 * @param {type} element
	 * @param {type} eventType
	 * @param {type} eventData
	 * @returns {_L8.$}
	 */
	$.trigger = function(element, eventType, eventData) {
		element.dispatchEvent(new CustomEvent(eventType, {
			detail: eventData,
			bubbles: true,
			cancelable: true
		}));
		
		return this;
	};
})(window, Zepto);
/*! iScroll v5.1.3 ~ (c) 2008-2014 Matteo Spinelli ~ http://cubiq.org/license */
(function(window, document, Math) {
	var rAF = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback) {
			window.setTimeout(callback, 1000 / 60);
		};

	var utils = (function() {
		var me = {};

		var _elementStyle = document.createElement('div').style;
		var _vendor = (function() {
			var vendors = ['t', 'webkitT', 'MozT', 'msT', 'OT'],
				transform,
				i = 0,
				l = vendors.length;

			for (; i < l; i++) {
				transform = vendors[i] + 'ransform';
				if (transform in _elementStyle) return vendors[i].substr(0, vendors[i].length - 1);
			}

			return false;
		})();

		function _prefixStyle(style) {
			if (_vendor === false) return false;
			if (_vendor === '') return style;
			return _vendor + style.charAt(0).toUpperCase() + style.substr(1);
		}

		me.getTime = Date.now || function getTime() {
			return new Date().getTime();
		};

		me.extend = function(target, obj) {
			for (var i in obj) {
				target[i] = obj[i];
			}
		};

		me.addEvent = function(el, type, fn, capture) {
			el.addEventListener(type, fn, !!capture);
		};

		me.removeEvent = function(el, type, fn, capture) {
			el.removeEventListener(type, fn, !!capture);
		};

		me.prefixPointerEvent = function(pointerEvent) {
			return window.MSPointerEvent ?
				'MSPointer' + pointerEvent.charAt(9).toUpperCase() + pointerEvent.substr(10) :
				pointerEvent;
		};

		me.momentum = function(current, start, time, lowerMargin, wrapperSize, deceleration) {
			var distance = current - start,
				speed = Math.abs(distance) / time,
				destination,
				duration;

			deceleration = deceleration === undefined ? 0.0006 : deceleration;

			destination = current + (speed * speed) / (2 * deceleration) * (distance < 0 ? -1 : 1);
			duration = speed / deceleration;

			if (destination < lowerMargin) {
				destination = wrapperSize ? lowerMargin - (wrapperSize / 2.5 * (speed / 8)) : lowerMargin;
				distance = Math.abs(destination - current);
				duration = distance / speed;
			} else if (destination > 0) {
				destination = wrapperSize ? wrapperSize / 2.5 * (speed / 8) : 0;
				distance = Math.abs(current) + destination;
				duration = distance / speed;
			}

			return {
				destination: Math.round(destination),
				duration: duration
			};
		};

		var _transform = _prefixStyle('transform');

		me.extend(me, {
			hasTransform: _transform !== false,
			hasPerspective: _prefixStyle('perspective') in _elementStyle,
			hasTouch: 'ontouchstart' in window,
			hasPointer: window.PointerEvent || window.MSPointerEvent, // IE10 is prefixed
			hasTransition: _prefixStyle('transition') in _elementStyle
		});

		// This should find all Android browsers lower than build 535.19 (both stock browser and webview)
		me.isBadAndroid = /Android /.test(window.navigator.appVersion) && !(/Chrome\/\d/.test(window.navigator.appVersion));

		me.extend(me.style = {}, {
			transform: _transform,
			transitionTimingFunction: _prefixStyle('transitionTimingFunction'),
			transitionDuration: _prefixStyle('transitionDuration'),
			transitionDelay: _prefixStyle('transitionDelay'),
			transformOrigin: _prefixStyle('transformOrigin')
		});

		me.hasClass = function(e, c) {
			var re = new RegExp("(^|\\s)" + c + "(\\s|$)");
			return re.test(e.className);
		};

		me.addClass = function(e, c) {
			if (me.hasClass(e, c)) {
				return;
			}

			var newclass = e.className.split(' ');
			newclass.push(c);
			e.className = newclass.join(' ');
		};

		me.removeClass = function(e, c) {
			if (!me.hasClass(e, c)) {
				return;
			}

			var re = new RegExp("(^|\\s)" + c + "(\\s|$)", 'g');
			e.className = e.className.replace(re, ' ');
		};

		me.offset = function(el) {
			var left = -el.offsetLeft,
				top = -el.offsetTop;

			// jshint -W084
			while (el = el.offsetParent) {
				left -= el.offsetLeft;
				top -= el.offsetTop;
			}
			// jshint +W084

			return {
				left: left,
				top: top
			};
		};

		me.preventDefaultException = function(el, exceptions) {
			for (var i in exceptions) {
				if (exceptions[i].test(el[i])) {
					return true;
				}
			}

			return false;
		};

		me.extend(me.eventType = {}, {
			touchstart: 1,
			touchmove: 1,
			touchend: 1,

			mousedown: 2,
			mousemove: 2,
			mouseup: 2,

			pointerdown: 3,
			pointermove: 3,
			pointerup: 3,

			MSPointerDown: 3,
			MSPointerMove: 3,
			MSPointerUp: 3
		});

		me.extend(me.ease = {}, {
			quadratic: {
				style: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				fn: function(k) {
					return k * (2 - k);
				}
			},
			circular: {
				style: 'cubic-bezier(0.1, 0.57, 0.1, 1)', // Not properly "circular" but this looks better, it should be (0.075, 0.82, 0.165, 1)
				fn: function(k) {
					return Math.sqrt(1 - (--k * k));
				}
			},
			back: {
				style: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
				fn: function(k) {
					var b = 4;
					return (k = k - 1) * k * ((b + 1) * k + b) + 1;
				}
			},
			bounce: {
				style: '',
				fn: function(k) {
					if ((k /= 1) < (1 / 2.75)) {
						return 7.5625 * k * k;
					} else if (k < (2 / 2.75)) {
						return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
					} else if (k < (2.5 / 2.75)) {
						return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
					} else {
						return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
					}
				}
			},
			elastic: {
				style: '',
				fn: function(k) {
					var f = 0.22,
						e = 0.4;

					if (k === 0) {
						return 0;
					}
					if (k == 1) {
						return 1;
					}

					return (e * Math.pow(2, -10 * k) * Math.sin((k - f / 4) * (2 * Math.PI) / f) + 1);
				}
			}
		});

		me.tap = function(e, eventName) {
			var ev = document.createEvent('Event');
			ev.initEvent(eventName, true, true);
			ev.pageX = e.pageX;
			ev.pageY = e.pageY;
			e.target.dispatchEvent(ev);
		};

		me.click = function(e) {
			var target = e.target,
				ev;

			if (!(/(SELECT|INPUT|TEXTAREA)/i).test(target.tagName)) {
				ev = document.createEvent('MouseEvents');
				ev.initMouseEvent('click', true, true, e.view, 1,
					target.screenX, target.screenY, target.clientX, target.clientY,
					e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
					0, null);

				ev._constructed = true;
				target.dispatchEvent(ev);
			}
		};

		return me;
	})();

	function IScroll(el, options) {
		this.wrapper = typeof el == 'string' ? document.querySelector(el) : el;
		this.scroller = this.wrapper.children[0];
		this.scrollerStyle = this.scroller.style; // cache style for better performance

		this.options = {

			resizeScrollbars: true,

			mouseWheelSpeed: 20,

			snapThreshold: 0.334,

			// INSERT POINT: OPTIONS 

			startX: 0,
			startY: 0,
			scrollY: true,
			directionLockThreshold: 5,
			momentum: true,

			bounce: true,
			bounceTime: 600,
			bounceEasing: '',

			preventDefault: true,
			preventDefaultException: {
				tagName: /^(INPUT|TEXTAREA|BUTTON|SELECT)$/
			},

			HWCompositing: true,
			useTransition: true,
			useTransform: true
		};

		for (var i in options) {
			this.options[i] = options[i];
		}

		// Normalize options
		this.translateZ = this.options.HWCompositing && utils.hasPerspective ? ' translateZ(0)' : '';

		this.options.useTransition = utils.hasTransition && this.options.useTransition;
		this.options.useTransform = utils.hasTransform && this.options.useTransform;

		this.options.eventPassthrough = this.options.eventPassthrough === true ? 'vertical' : this.options.eventPassthrough;
		this.options.preventDefault = !this.options.eventPassthrough && this.options.preventDefault;

		// If you want eventPassthrough I have to lock one of the axes
		this.options.scrollY = this.options.eventPassthrough == 'vertical' ? false : this.options.scrollY;
		this.options.scrollX = this.options.eventPassthrough == 'horizontal' ? false : this.options.scrollX;

		// With eventPassthrough we also need lockDirection mechanism
		this.options.freeScroll = this.options.freeScroll && !this.options.eventPassthrough;
		this.options.directionLockThreshold = this.options.eventPassthrough ? 0 : this.options.directionLockThreshold;

		this.options.bounceEasing = typeof this.options.bounceEasing == 'string' ? utils.ease[this.options.bounceEasing] || utils.ease.circular : this.options.bounceEasing;

		this.options.resizePolling = this.options.resizePolling === undefined ? 60 : this.options.resizePolling;

		if (this.options.tap === true) {
			this.options.tap = 'tap';
		}

		if (this.options.shrinkScrollbars == 'scale') {
			this.options.useTransition = false;
		}

		this.options.invertWheelDirection = this.options.invertWheelDirection ? -1 : 1;

		if (this.options.probeType == 3) {
			this.options.useTransition = false;
		}

		// INSERT POINT: NORMALIZATION

		// Some defaults	
		this.x = 0;
		this.y = 0;
		this.directionX = 0;
		this.directionY = 0;
		this._events = {};

		// INSERT POINT: DEFAULTS

		this._init();
		this.refresh();

		this.scrollTo(this.options.startX, this.options.startY);
		this.enable();
	}

	IScroll.prototype = {
		version: '5.1.3',

		_init: function() {
			this._initEvents();

			if (this.options.scrollbars || this.options.indicators) {
				this._initIndicators();
			}

			if (this.options.mouseWheel) {
				this._initWheel();
			}

			if (this.options.snap) {
				this._initSnap();
			}

			if (this.options.keyBindings) {
				this._initKeys();
			}

			// INSERT POINT: _init

		},

		destroy: function() {
			this._initEvents(true);

			this._execEvent('destroy');
		},

		_transitionEnd: function(e) {
			if (e.target != this.scroller || !this.isInTransition) {
				return;
			}

			this._transitionTime();
			if (!this.resetPosition(this.options.bounceTime)) {
				this.isInTransition = false;
				this._execEvent('scrollEnd');
			}
		},

		_start: function(e) {
			// React to left mouse button only
			if (utils.eventType[e.type] != 1) {
				if (e.button !== 0) {
					return;
				}
			}

			if (!this.enabled || (this.initiated && utils.eventType[e.type] !== this.initiated)) {
				return;
			}

			if (this.options.preventDefault && !utils.isBadAndroid && !utils.preventDefaultException(e.target, this.options.preventDefaultException)) {
				e.preventDefault();
			}

			var point = e.touches ? e.touches[0] : e,
				pos;

			this.initiated = utils.eventType[e.type];
			this.moved = false;
			this.distX = 0;
			this.distY = 0;
			this.directionX = 0;
			this.directionY = 0;
			this.directionLocked = 0;

			this._transitionTime();

			this.startTime = utils.getTime();

			if (this.options.useTransition && this.isInTransition) {
				this.isInTransition = false;
				pos = this.getComputedPosition();
				this._translate(Math.round(pos.x), Math.round(pos.y));
				this._execEvent('scrollEnd');
			} else if (!this.options.useTransition && this.isAnimating) {
				this.isAnimating = false;
				this._execEvent('scrollEnd');
			}

			this.startX = this.x;
			this.startY = this.y;
			this.absStartX = this.x;
			this.absStartY = this.y;
			this.pointX = point.pageX;
			this.pointY = point.pageY;

			this._execEvent('beforeScrollStart');
		},

		_move: function(e) {
			if (!this.enabled || utils.eventType[e.type] !== this.initiated) {
				return;
			}

			if (this.options.preventDefault) { // increases performance on Android? TODO: check!
				e.preventDefault();
			}


			var point = e.touches ? e.touches[0] : e,
				deltaX = point.pageX - this.pointX,
				deltaY = point.pageY - this.pointY,
				timestamp = utils.getTime(),
				newX, newY,
				absDistX, absDistY;

			this.pointX = point.pageX;
			this.pointY = point.pageY;

			this.distX += deltaX;
			this.distY += deltaY;
			absDistX = Math.abs(this.distX);
			absDistY = Math.abs(this.distY);

			if (this.options.scrollY) {
				var diff_x = point.pageX - this.pointX,
					diff_y = point.pageY - this.pointY;
				if (this.options.probeType > 1) {
					this._execEvent('scroll');
				}
				if (Math.abs(360 * Math.atan(diff_y / diff_x) / (2 * Math.PI)) < 60) return;
				if (!d6.verticalSwipe) return;
			}

			// We need to move at least 10 pixels for the scrolling to initiate
			if (timestamp - this.endTime > 300 && (absDistX < 10 && absDistY < 10)) {
				return;
			}

			// If you are scrolling in one direction lock the other
			if (!this.directionLocked && !this.options.freeScroll) {
				if (absDistX > absDistY + this.options.directionLockThreshold) {
					this.directionLocked = 'h'; // lock horizontally
				} else if (absDistY >= absDistX + this.options.directionLockThreshold) {
					this.directionLocked = 'v'; // lock vertically
				} else {
					this.directionLocked = 'n'; // no lock
				}
			}

			if (this.directionLocked == 'h') {
				if (this.options.eventPassthrough == 'vertical') {
					e.preventDefault();
				} else if (this.options.eventPassthrough == 'horizontal') {
					this.initiated = false;
					return;
				}

				deltaY = 0;
			} else if (this.directionLocked == 'v') {
				if (this.options.eventPassthrough == 'horizontal') {
					e.preventDefault();
				} else if (this.options.eventPassthrough == 'vertical') {
					this.initiated = false;
					return;
				}

				deltaX = 0;
			}

			deltaX = this.hasHorizontalScroll ? deltaX : 0;
			deltaY = this.hasVerticalScroll ? deltaY : 0;

			newX = this.x + deltaX;
			newY = this.y + deltaY;

			// Slow down if outside of the boundaries
			if (newX > 0 || newX < this.maxScrollX) {
				newX = this.options.bounce ? this.x + deltaX / 3 : newX > 0 ? 0 : this.maxScrollX;
			}
			if (newY > 0 || newY < this.maxScrollY) {
				newY = this.options.bounce ? this.y + deltaY / 3 : newY > 0 ? 0 : this.maxScrollY;
			}

			this.directionX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
			this.directionY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

			if (!this.moved) {
				this._execEvent('scrollStart');
			}

			this.moved = true;

			this._translate(newX, newY);

			/* REPLACE START: _move */
			if (timestamp - this.startTime > 300) {
				this.startTime = timestamp;
				this.startX = this.x;
				this.startY = this.y;

				if (this.options.probeType == 1) {
					this._execEvent('scroll');
				}
			}

			if (this.options.probeType > 1) {
				this._execEvent('scroll');
			}
			/* REPLACE END: _move */

		},

		_end: function(e) {
			if (!this.enabled || utils.eventType[e.type] !== this.initiated) {
				return;
			}

			if (this.options.preventDefault && !utils.preventDefaultException(e.target, this.options.preventDefaultException)) {
				e.preventDefault();
			}

			var point = e.changedTouches ? e.changedTouches[0] : e,
				momentumX,
				momentumY,
				duration = utils.getTime() - this.startTime,
				newX = Math.round(this.x),
				newY = Math.round(this.y),
				distanceX = Math.abs(newX - this.startX),
				distanceY = Math.abs(newY - this.startY),
				time = 0,
				easing = '';

			this.isInTransition = 0;
			this.initiated = 0;
			this.endTime = utils.getTime();

			// reset if we are outside of the boundaries
			if (this.resetPosition(this.options.bounceTime)) {
				return;
			}

			this.scrollTo(newX, newY); // ensures that the last position is rounded

			// we scrolled less than 10 pixels
			if (!this.moved) {
				if (this.options.tap) {
					utils.tap(e, this.options.tap);
				}

				if (this.options.click) {
					utils.click(e);
				}

				this._execEvent('scrollCancel');
				return;
			}

			if (this._events.flick && duration < 200 && distanceX < 100 && distanceY < 100) {
				this._execEvent('flick');
				return;
			}

			// start momentum animation if needed
			if (this.options.momentum && duration < 300) {
				momentumX = this.hasHorizontalScroll ? utils.momentum(this.x, this.startX, duration, this.maxScrollX, this.options.bounce ? this.wrapperWidth : 0, this.options.deceleration) : {
					destination: newX,
					duration: 0
				};
				momentumY = this.hasVerticalScroll ? utils.momentum(this.y, this.startY, duration, this.maxScrollY, this.options.bounce ? this.wrapperHeight : 0, this.options.deceleration) : {
					destination: newY,
					duration: 0
				};
				newX = momentumX.destination;
				newY = momentumY.destination;
				time = Math.max(momentumX.duration, momentumY.duration);
				this.isInTransition = 1;
			}


			if (this.options.snap) {
				var snap = this._nearestSnap(newX, newY);
				this.currentPage = snap;
				time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(newX - snap.x), 1000),
						Math.min(Math.abs(newY - snap.y), 1000)
					), 300);
				newX = snap.x;
				newY = snap.y;

				this.directionX = 0;
				this.directionY = 0;
				easing = this.options.bounceEasing;
			}

			// INSERT POINT: _end

			if (newX != this.x || newY != this.y) {
				// change easing function when scroller goes out of the boundaries
				if (newX > 0 || newX < this.maxScrollX || newY > 0 || newY < this.maxScrollY) {
					easing = utils.ease.quadratic;
				}

				this.scrollTo(newX, newY, time, easing);
				return;
			}

			this._execEvent('scrollEnd');
		},

		_resize: function() {
			var that = this;

			clearTimeout(this.resizeTimeout);

			this.resizeTimeout = setTimeout(function() {
				that.refresh();
			}, this.options.resizePolling);
		},

		resetPosition: function(time) {
			var x = this.x,
				y = this.y;

			time = time || 0;

			if (!this.hasHorizontalScroll || this.x > 0) {
				x = 0;
			} else if (this.x < this.maxScrollX) {
				x = this.maxScrollX;
			}

			if (!this.hasVerticalScroll || this.y > 0) {
				y = 0;
			} else if (this.y < this.maxScrollY) {
				y = this.maxScrollY;
			}

			if (x == this.x && y == this.y) {
				return false;
			}

			this.scrollTo(x, y, time, this.options.bounceEasing);

			return true;
		},

		disable: function() {
			this.enabled = false;
		},

		enable: function() {
			this.enabled = true;
		},

		refresh: function() {
			var rf = this.wrapper.offsetHeight; // Force reflow

			this.wrapperWidth = this.wrapper.clientWidth;
			this.wrapperHeight = this.wrapper.clientHeight;

			/* REPLACE START: refresh */

			this.scrollerWidth = this.scroller.offsetWidth;
			this.scrollerHeight = this.scroller.offsetHeight;

			this.maxScrollX = this.wrapperWidth - this.scrollerWidth;
			this.maxScrollY = this.wrapperHeight - this.scrollerHeight;

			/* REPLACE END: refresh */

			this.hasHorizontalScroll = this.options.scrollX && this.maxScrollX < 0;
			this.hasVerticalScroll = this.options.scrollY && this.maxScrollY < 0;

			if (!this.hasHorizontalScroll) {
				this.maxScrollX = 0;
				this.scrollerWidth = this.wrapperWidth;
			}

			if (!this.hasVerticalScroll) {
				this.maxScrollY = 0;
				this.scrollerHeight = this.wrapperHeight;
			}

			this.endTime = 0;
			this.directionX = 0;
			this.directionY = 0;

			this.wrapperOffset = utils.offset(this.wrapper);

			this._execEvent('refresh');

			this.resetPosition();

			// INSERT POINT: _refresh

		},

		on: function(type, fn) {
			if (!this._events[type]) {
				this._events[type] = [];
			}

			this._events[type].push(fn);
		},

		off: function(type, fn) {
			if (!this._events[type]) {
				return;
			}

			var index = this._events[type].indexOf(fn);

			if (index > -1) {
				this._events[type].splice(index, 1);
			}
		},

		_execEvent: function(type) {
			if (!this._events[type]) {
				return;
			}

			var i = 0,
				l = this._events[type].length;

			if (!l) {
				return;
			}

			for (; i < l; i++) {
				this._events[type][i].apply(this, [].slice.call(arguments, 1));
			}
		},

		scrollBy: function(x, y, time, easing) {
			x = this.x + x;
			y = this.y + y;
			time = time || 0;

			this.scrollTo(x, y, time, easing);
		},

		scrollTo: function(x, y, time, easing) {
			easing = easing || utils.ease.circular;

			this.isInTransition = this.options.useTransition && time > 0;

			if (!time || (this.options.useTransition && easing.style)) {
				this._transitionTimingFunction(easing.style);
				this._transitionTime(time);
				this._translate(x, y);
			} else {
				this._animate(x, y, time, easing.fn);
			}
		},

		scrollToElement: function(el, time, offsetX, offsetY, easing) {
			el = el.nodeType ? el : this.scroller.querySelector(el);

			if (!el) {
				return;
			}

			var pos = utils.offset(el);

			pos.left -= this.wrapperOffset.left;
			pos.top -= this.wrapperOffset.top;

			// if offsetX/Y are true we center the element to the screen
			if (offsetX === true) {
				offsetX = Math.round(el.offsetWidth / 2 - this.wrapper.offsetWidth / 2);
			}
			if (offsetY === true) {
				offsetY = Math.round(el.offsetHeight / 2 - this.wrapper.offsetHeight / 2);
			}

			pos.left -= offsetX || 0;
			pos.top -= offsetY || 0;

			pos.left = pos.left > 0 ? 0 : pos.left < this.maxScrollX ? this.maxScrollX : pos.left;
			pos.top = pos.top > 0 ? 0 : pos.top < this.maxScrollY ? this.maxScrollY : pos.top;

			time = time === undefined || time === null || time === 'auto' ? Math.max(Math.abs(this.x - pos.left), Math.abs(this.y - pos.top)) : time;

			this.scrollTo(pos.left, pos.top, time, easing);
		},

		_transitionTime: function(time) {
			time = time || 0;

			this.scrollerStyle[utils.style.transitionDuration] = time + 'ms';

			if (!time && utils.isBadAndroid) {
				this.scrollerStyle[utils.style.transitionDuration] = '0.001s';
			}


			if (this.indicators) {
				for (var i = this.indicators.length; i--;) {
					this.indicators[i].transitionTime(time);
				}
			}


			// INSERT POINT: _transitionTime

		},

		_transitionTimingFunction: function(easing) {
			this.scrollerStyle[utils.style.transitionTimingFunction] = easing;


			if (this.indicators) {
				for (var i = this.indicators.length; i--;) {
					this.indicators[i].transitionTimingFunction(easing);
				}
			}


			// INSERT POINT: _transitionTimingFunction

		},

		_translate: function(x, y) {
			if (this.options.useTransform) {

				/* REPLACE START: _translate */

				this.scrollerStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.translateZ;

				/* REPLACE END: _translate */

			} else {
				x = Math.round(x);
				y = Math.round(y);
				this.scrollerStyle.left = x + 'px';
				this.scrollerStyle.top = y + 'px';
			}

			this.x = x;
			this.y = y;


			if (this.indicators) {
				for (var i = this.indicators.length; i--;) {
					this.indicators[i].updatePosition();
				}
			}


			// INSERT POINT: _translate

		},

		_initEvents: function(remove) {
			var eventType = remove ? utils.removeEvent : utils.addEvent,
				target = this.options.bindToWrapper ? this.wrapper : window;

			eventType(window, 'orientationchange', this);
			eventType(window, 'resize', this);

			if (this.options.click) {
				eventType(this.wrapper, 'click', this, true);
			}

			if (!this.options.disableMouse) {
				eventType(this.wrapper, 'mousedown', this);
				eventType(target, 'mousemove', this);
				eventType(target, 'mousecancel', this);
				eventType(target, 'mouseup', this);
			}

			if (utils.hasPointer && !this.options.disablePointer) {
				eventType(this.wrapper, utils.prefixPointerEvent('pointerdown'), this);
				eventType(target, utils.prefixPointerEvent('pointermove'), this);
				eventType(target, utils.prefixPointerEvent('pointercancel'), this);
				eventType(target, utils.prefixPointerEvent('pointerup'), this);
			}

			if (utils.hasTouch && !this.options.disableTouch) {
				eventType(this.wrapper, 'touchstart', this);
				eventType(target, 'touchmove', this);
				eventType(target, 'touchcancel', this);
				eventType(target, 'touchend', this);
			}

			eventType(this.scroller, 'transitionend', this);
			eventType(this.scroller, 'webkitTransitionEnd', this);
			eventType(this.scroller, 'oTransitionEnd', this);
			eventType(this.scroller, 'MSTransitionEnd', this);
		},

		getComputedPosition: function() {
			var matrix = window.getComputedStyle(this.scroller, null),
				x, y;

			if (this.options.useTransform) {
				matrix = matrix[utils.style.transform].split(')')[0].split(', ');
				x = +(matrix[12] || matrix[4]);
				y = +(matrix[13] || matrix[5]);
			} else {
				x = +matrix.left.replace(/[^-\d.]/g, '');
				y = +matrix.top.replace(/[^-\d.]/g, '');
			}

			return {
				x: x,
				y: y
			};
		},

		_initIndicators: function() {
			var interactive = this.options.interactiveScrollbars,
				customStyle = typeof this.options.scrollbars != 'string',
				indicators = [],
				indicator;

			var that = this;

			this.indicators = [];

			if (this.options.scrollbars) {
				// Vertical scrollbar
				if (this.options.scrollY) {
					indicator = {
						el: createDefaultScrollbar('v', interactive, this.options.scrollbars),
						interactive: interactive,
						defaultScrollbars: true,
						customStyle: customStyle,
						resize: this.options.resizeScrollbars,
						shrink: this.options.shrinkScrollbars,
						fade: this.options.fadeScrollbars,
						listenX: false
					};

					this.wrapper.appendChild(indicator.el);
					indicators.push(indicator);
				}

				// Horizontal scrollbar
				if (this.options.scrollX) {
					indicator = {
						el: createDefaultScrollbar('h', interactive, this.options.scrollbars),
						interactive: interactive,
						defaultScrollbars: true,
						customStyle: customStyle,
						resize: this.options.resizeScrollbars,
						shrink: this.options.shrinkScrollbars,
						fade: this.options.fadeScrollbars,
						listenY: false
					};

					this.wrapper.appendChild(indicator.el);
					indicators.push(indicator);
				}
			}

			if (this.options.indicators) {
				// TODO: check concat compatibility
				indicators = indicators.concat(this.options.indicators);
			}

			for (var i = indicators.length; i--;) {
				this.indicators.push(new Indicator(this, indicators[i]));
			}

			// TODO: check if we can use array.map (wide compatibility and performance issues)
			function _indicatorsMap(fn) {
				for (var i = that.indicators.length; i--;) {
					fn.call(that.indicators[i]);
				}
			}

			if (this.options.fadeScrollbars) {
				this.on('scrollEnd', function() {
					_indicatorsMap(function() {
						this.fade();
					});
				});

				this.on('scrollCancel', function() {
					_indicatorsMap(function() {
						this.fade();
					});
				});

				this.on('scrollStart', function() {
					_indicatorsMap(function() {
						this.fade(1);
					});
				});

				this.on('beforeScrollStart', function() {
					_indicatorsMap(function() {
						this.fade(1, true);
					});
				});
			}


			this.on('refresh', function() {
				_indicatorsMap(function() {
					this.refresh();
				});
			});

			this.on('destroy', function() {
				_indicatorsMap(function() {
					this.destroy();
				});

				delete this.indicators;
			});
		},

		_initWheel: function() {
			utils.addEvent(this.wrapper, 'wheel', this);
			utils.addEvent(this.wrapper, 'mousewheel', this);
			utils.addEvent(this.wrapper, 'DOMMouseScroll', this);

			this.on('destroy', function() {
				utils.removeEvent(this.wrapper, 'wheel', this);
				utils.removeEvent(this.wrapper, 'mousewheel', this);
				utils.removeEvent(this.wrapper, 'DOMMouseScroll', this);
			});
		},

		_wheel: function(e) {
			if (!this.enabled) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			var wheelDeltaX, wheelDeltaY,
				newX, newY,
				that = this;

			if (this.wheelTimeout === undefined) {
				that._execEvent('scrollStart');
			}

			// Execute the scrollEnd event after 400ms the wheel stopped scrolling
			clearTimeout(this.wheelTimeout);
			this.wheelTimeout = setTimeout(function() {
				that._execEvent('scrollEnd');
				that.wheelTimeout = undefined;
			}, 400);

			if ('deltaX' in e) {
				if (e.deltaMode === 1) {
					wheelDeltaX = -e.deltaX * this.options.mouseWheelSpeed;
					wheelDeltaY = -e.deltaY * this.options.mouseWheelSpeed;
				} else {
					wheelDeltaX = -e.deltaX;
					wheelDeltaY = -e.deltaY;
				}
			} else if ('wheelDeltaX' in e) {
				wheelDeltaX = e.wheelDeltaX / 120 * this.options.mouseWheelSpeed;
				wheelDeltaY = e.wheelDeltaY / 120 * this.options.mouseWheelSpeed;
			} else if ('wheelDelta' in e) {
				wheelDeltaX = wheelDeltaY = e.wheelDelta / 120 * this.options.mouseWheelSpeed;
			} else if ('detail' in e) {
				wheelDeltaX = wheelDeltaY = -e.detail / 3 * this.options.mouseWheelSpeed;
			} else {
				return;
			}

			wheelDeltaX *= this.options.invertWheelDirection;
			wheelDeltaY *= this.options.invertWheelDirection;

			if (!this.hasVerticalScroll) {
				wheelDeltaX = wheelDeltaY;
				wheelDeltaY = 0;
			}

			if (this.options.snap) {
				newX = this.currentPage.pageX;
				newY = this.currentPage.pageY;

				if (wheelDeltaX > 0) {
					newX--;
				} else if (wheelDeltaX < 0) {
					newX++;
				}

				if (wheelDeltaY > 0) {
					newY--;
				} else if (wheelDeltaY < 0) {
					newY++;
				}

				this.goToPage(newX, newY);

				return;
			}

			newX = this.x + Math.round(this.hasHorizontalScroll ? wheelDeltaX : 0);
			newY = this.y + Math.round(this.hasVerticalScroll ? wheelDeltaY : 0);

			if (newX > 0) {
				newX = 0;
			} else if (newX < this.maxScrollX) {
				newX = this.maxScrollX;
			}

			if (newY > 0) {
				newY = 0;
			} else if (newY < this.maxScrollY) {
				newY = this.maxScrollY;
			}

			this.scrollTo(newX, newY, 0);

			if (this.options.probeType > 1) {
				this._execEvent('scroll');
			}

			// INSERT POINT: _wheel
		},

		_initSnap: function() {
			this.currentPage = {};

			if (typeof this.options.snap == 'string') {
				this.options.snap = this.scroller.querySelectorAll(this.options.snap);
			}

			this.on('refresh', function() {
				var i = 0,
					l,
					m = 0,
					n,
					cx, cy,
					x = 0,
					y,
					stepX = this.options.snapStepX || this.wrapperWidth,
					stepY = this.options.snapStepY || this.wrapperHeight,
					el;

				this.pages = [];

				if (!this.wrapperWidth || !this.wrapperHeight || !this.scrollerWidth || !this.scrollerHeight) {
					return;
				}

				if (this.options.snap === true) {
					cx = Math.round(stepX / 2);
					cy = Math.round(stepY / 2);

					while (x > -this.scrollerWidth) {
						this.pages[i] = [];
						l = 0;
						y = 0;

						while (y > -this.scrollerHeight) {
							this.pages[i][l] = {
								x: Math.max(x, this.maxScrollX),
								y: Math.max(y, this.maxScrollY),
								width: stepX,
								height: stepY,
								cx: x - cx,
								cy: y - cy
							};

							y -= stepY;
							l++;
						}

						x -= stepX;
						i++;
					}
				} else {
					el = this.options.snap;
					l = el.length;
					n = -1;

					for (; i < l; i++) {
						if (i === 0 || el[i].offsetLeft <= el[i - 1].offsetLeft) {
							m = 0;
							n++;
						}

						if (!this.pages[m]) {
							this.pages[m] = [];
						}

						x = Math.max(-el[i].offsetLeft, this.maxScrollX);
						y = Math.max(-el[i].offsetTop, this.maxScrollY);
						cx = x - Math.round(el[i].offsetWidth / 2);
						cy = y - Math.round(el[i].offsetHeight / 2);

						this.pages[m][n] = {
							x: x,
							y: y,
							width: el[i].offsetWidth,
							height: el[i].offsetHeight,
							cx: cx,
							cy: cy
						};

						if (x > this.maxScrollX) {
							m++;
						}
					}
				}

				this.goToPage(this.currentPage.pageX || 0, this.currentPage.pageY || 0, 0);

				// Update snap threshold if needed
				if (this.options.snapThreshold % 1 === 0) {
					this.snapThresholdX = this.options.snapThreshold;
					this.snapThresholdY = this.options.snapThreshold;
				} else {
					this.snapThresholdX = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].width * this.options.snapThreshold);
					this.snapThresholdY = Math.round(this.pages[this.currentPage.pageX][this.currentPage.pageY].height * this.options.snapThreshold);
				}
			});

			this.on('flick', function() {
				var time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(this.x - this.startX), 1000),
						Math.min(Math.abs(this.y - this.startY), 1000)
					), 300);

				this.goToPage(
					this.currentPage.pageX + this.directionX,
					this.currentPage.pageY + this.directionY,
					time
				);
			});
		},

		_nearestSnap: function(x, y) {
			if (!this.pages.length) {
				return {
					x: 0,
					y: 0,
					pageX: 0,
					pageY: 0
				};
			}

			var i = 0,
				l = this.pages.length,
				m = 0;

			// Check if we exceeded the snap threshold
			if (Math.abs(x - this.absStartX) < this.snapThresholdX &&
				Math.abs(y - this.absStartY) < this.snapThresholdY) {
				return this.currentPage;
			}

			if (x > 0) {
				x = 0;
			} else if (x < this.maxScrollX) {
				x = this.maxScrollX;
			}

			if (y > 0) {
				y = 0;
			} else if (y < this.maxScrollY) {
				y = this.maxScrollY;
			}

			for (; i < l; i++) {
				if (x >= this.pages[i][0].cx) {
					x = this.pages[i][0].x;
					break;
				}
			}

			l = this.pages[i].length;

			for (; m < l; m++) {
				if (y >= this.pages[0][m].cy) {
					y = this.pages[0][m].y;
					break;
				}
			}

			if (i == this.currentPage.pageX) {
				i += this.directionX;

				if (i < 0) {
					i = 0;
				} else if (i >= this.pages.length) {
					i = this.pages.length - 1;
				}

				x = this.pages[i][0].x;
			}

			if (m == this.currentPage.pageY) {
				m += this.directionY;

				if (m < 0) {
					m = 0;
				} else if (m >= this.pages[0].length) {
					m = this.pages[0].length - 1;
				}

				y = this.pages[0][m].y;
			}

			return {
				x: x,
				y: y,
				pageX: i,
				pageY: m
			};
		},

		goToPage: function(x, y, time, easing) {
			easing = easing || this.options.bounceEasing;

			if (x >= this.pages.length) {
				x = this.pages.length - 1;
			} else if (x < 0) {
				x = 0;
			}

			if (y >= this.pages[x].length) {
				y = this.pages[x].length - 1;
			} else if (y < 0) {
				y = 0;
			}

			var posX = this.pages[x][y].x,
				posY = this.pages[x][y].y;

			time = time === undefined ? this.options.snapSpeed || Math.max(
				Math.max(
					Math.min(Math.abs(posX - this.x), 1000),
					Math.min(Math.abs(posY - this.y), 1000)
				), 300) : time;

			this.currentPage = {
				x: posX,
				y: posY,
				pageX: x,
				pageY: y
			};

			this.scrollTo(posX, posY, time, easing);
		},

		next: function(time, easing) {
			var x = this.currentPage.pageX,
				y = this.currentPage.pageY;

			x++;

			if (x >= this.pages.length && this.hasVerticalScroll) {
				x = 0;
				y++;
			}

			this.goToPage(x, y, time, easing);
		},

		prev: function(time, easing) {
			var x = this.currentPage.pageX,
				y = this.currentPage.pageY;

			x--;

			if (x < 0 && this.hasVerticalScroll) {
				x = 0;
				y--;
			}

			this.goToPage(x, y, time, easing);
		},

		_initKeys: function(e) {
			// default key bindings
			var keys = {
				pageUp: 33,
				pageDown: 34,
				end: 35,
				home: 36,
				left: 37,
				up: 38,
				right: 39,
				down: 40
			};
			var i;

			// if you give me characters I give you keycode
			if (typeof this.options.keyBindings == 'object') {
				for (i in this.options.keyBindings) {
					if (typeof this.options.keyBindings[i] == 'string') {
						this.options.keyBindings[i] = this.options.keyBindings[i].toUpperCase().charCodeAt(0);
					}
				}
			} else {
				this.options.keyBindings = {};
			}

			for (i in keys) {
				this.options.keyBindings[i] = this.options.keyBindings[i] || keys[i];
			}

			utils.addEvent(window, 'keydown', this);

			this.on('destroy', function() {
				utils.removeEvent(window, 'keydown', this);
			});
		},

		_key: function(e) {
			if (!this.enabled) {
				return;
			}

			var snap = this.options.snap, // we are using this alot, better to cache it
				newX = snap ? this.currentPage.pageX : this.x,
				newY = snap ? this.currentPage.pageY : this.y,
				now = utils.getTime(),
				prevTime = this.keyTime || 0,
				acceleration = 0.250,
				pos;

			if (this.options.useTransition && this.isInTransition) {
				pos = this.getComputedPosition();

				this._translate(Math.round(pos.x), Math.round(pos.y));
				this.isInTransition = false;
			}

			this.keyAcceleration = now - prevTime < 200 ? Math.min(this.keyAcceleration + acceleration, 50) : 0;

			switch (e.keyCode) {
				case this.options.keyBindings.pageUp:
					if (this.hasHorizontalScroll && !this.hasVerticalScroll) {
						newX += snap ? 1 : this.wrapperWidth;
					} else {
						newY += snap ? 1 : this.wrapperHeight;
					}
					break;
				case this.options.keyBindings.pageDown:
					if (this.hasHorizontalScroll && !this.hasVerticalScroll) {
						newX -= snap ? 1 : this.wrapperWidth;
					} else {
						newY -= snap ? 1 : this.wrapperHeight;
					}
					break;
				case this.options.keyBindings.end:
					newX = snap ? this.pages.length - 1 : this.maxScrollX;
					newY = snap ? this.pages[0].length - 1 : this.maxScrollY;
					break;
				case this.options.keyBindings.home:
					newX = 0;
					newY = 0;
					break;
				case this.options.keyBindings.left:
					newX += snap ? -1 : 5 + this.keyAcceleration >> 0;
					break;
				case this.options.keyBindings.up:
					newY += snap ? 1 : 5 + this.keyAcceleration >> 0;
					break;
				case this.options.keyBindings.right:
					newX -= snap ? -1 : 5 + this.keyAcceleration >> 0;
					break;
				case this.options.keyBindings.down:
					newY -= snap ? 1 : 5 + this.keyAcceleration >> 0;
					break;
				default:
					return;
			}

			if (snap) {
				this.goToPage(newX, newY);
				return;
			}

			if (newX > 0) {
				newX = 0;
				this.keyAcceleration = 0;
			} else if (newX < this.maxScrollX) {
				newX = this.maxScrollX;
				this.keyAcceleration = 0;
			}

			if (newY > 0) {
				newY = 0;
				this.keyAcceleration = 0;
			} else if (newY < this.maxScrollY) {
				newY = this.maxScrollY;
				this.keyAcceleration = 0;
			}

			this.scrollTo(newX, newY, 0);

			this.keyTime = now;
		},

		_animate: function(destX, destY, duration, easingFn) {
			var that = this,
				startX = this.x,
				startY = this.y,
				startTime = utils.getTime(),
				destTime = startTime + duration;

			function step() {
				var now = utils.getTime(),
					newX, newY,
					easing;

				if (now >= destTime) {
					that.isAnimating = false;
					that._translate(destX, destY);

					if (!that.resetPosition(that.options.bounceTime)) {
						that._execEvent('scrollEnd');
					}

					return;
				}

				now = (now - startTime) / duration;
				easing = easingFn(now);
				newX = (destX - startX) * easing + startX;
				newY = (destY - startY) * easing + startY;
				that._translate(newX, newY);

				if (that.isAnimating) {
					rAF(step);
				}

				if (that.options.probeType == 3) {
					that._execEvent('scroll');
				}
			}

			this.isAnimating = true;
			step();
		},

		handleEvent: function(e) {
			switch (e.type) {
				case 'touchstart':
				case 'pointerdown':
				case 'MSPointerDown':
				case 'mousedown':
					this._start(e);
					break;
				case 'touchmove':
				case 'pointermove':
				case 'MSPointerMove':
				case 'mousemove':
					this._move(e);
					break;
				case 'touchend':
				case 'pointerup':
				case 'MSPointerUp':
				case 'mouseup':
				case 'touchcancel':
				case 'pointercancel':
				case 'MSPointerCancel':
				case 'mousecancel':
					this._end(e);
					break;
				case 'orientationchange':
				case 'resize':
					this._resize();
					break;
				case 'transitionend':
				case 'webkitTransitionEnd':
				case 'oTransitionEnd':
				case 'MSTransitionEnd':
					this._transitionEnd(e);
					break;
				case 'wheel':
				case 'DOMMouseScroll':
				case 'mousewheel':
					this._wheel(e);
					break;
				case 'keydown':
					this._key(e);
					break;
				case 'click':
					if (!e._constructed) {
						e.preventDefault();
						e.stopPropagation();
					}
					break;
			}
		}
	};

	function createDefaultScrollbar(direction, interactive, type) {
		var scrollbar = document.createElement('div'),
			indicator = document.createElement('div');

		if (type === true) {
			scrollbar.style.cssText = 'position:absolute;z-index:9999';
			indicator.style.cssText = '-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;position:absolute;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.9);border-radius:3px';
		}

		indicator.className = 'iScrollIndicator';

		if (direction == 'h') {
			if (type === true) {
				scrollbar.style.cssText += ';height:7px;left:2px;right:2px;bottom:0';
				indicator.style.height = '100%';
			}
			scrollbar.className = 'iScrollHorizontalScrollbar';
		} else {
			if (type === true) {
				scrollbar.style.cssText += ';width:7px;bottom:2px;top:2px;right:1px';
				indicator.style.width = '100%';
			}
			scrollbar.className = 'iScrollVerticalScrollbar';
		}

		scrollbar.style.cssText += ';overflow:hidden';

		if (!interactive) {
			scrollbar.style.pointerEvents = 'none';
		}

		scrollbar.appendChild(indicator);

		return scrollbar;
	}

	function Indicator(scroller, options) {
		this.wrapper = typeof options.el == 'string' ? document.querySelector(options.el) : options.el;
		this.wrapperStyle = this.wrapper.style;
		this.indicator = this.wrapper.children[0];
		this.indicatorStyle = this.indicator.style;
		this.scroller = scroller;

		this.options = {
			listenX: true,
			listenY: true,
			interactive: false,
			resize: true,
			defaultScrollbars: false,
			shrink: false,
			fade: false,
			speedRatioX: 0,
			speedRatioY: 0
		};

		for (var i in options) {
			this.options[i] = options[i];
		}

		this.sizeRatioX = 1;
		this.sizeRatioY = 1;
		this.maxPosX = 0;
		this.maxPosY = 0;

		if (this.options.interactive) {
			if (!this.options.disableTouch) {
				utils.addEvent(this.indicator, 'touchstart', this);
				utils.addEvent(window, 'touchend', this);
			}
			if (!this.options.disablePointer) {
				utils.addEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
				utils.addEvent(window, utils.prefixPointerEvent('pointerup'), this);
			}
			if (!this.options.disableMouse) {
				utils.addEvent(this.indicator, 'mousedown', this);
				utils.addEvent(window, 'mouseup', this);
			}
		}

		if (this.options.fade) {
			this.wrapperStyle[utils.style.transform] = this.scroller.translateZ;
			this.wrapperStyle[utils.style.transitionDuration] = utils.isBadAndroid ? '0.001s' : '0ms';
			this.wrapperStyle.opacity = '0';
		}
	}

	Indicator.prototype = {
		handleEvent: function(e) {
			switch (e.type) {
				case 'touchstart':
				case 'pointerdown':
				case 'MSPointerDown':
				case 'mousedown':
					this._start(e);
					break;
				case 'touchmove':
				case 'pointermove':
				case 'MSPointerMove':
				case 'mousemove':
					this._move(e);
					break;
				case 'touchend':
				case 'pointerup':
				case 'MSPointerUp':
				case 'mouseup':
				case 'touchcancel':
				case 'pointercancel':
				case 'MSPointerCancel':
				case 'mousecancel':
					this._end(e);
					break;
			}
		},

		destroy: function() {
			if (this.options.interactive) {
				utils.removeEvent(this.indicator, 'touchstart', this);
				utils.removeEvent(this.indicator, utils.prefixPointerEvent('pointerdown'), this);
				utils.removeEvent(this.indicator, 'mousedown', this);

				utils.removeEvent(window, 'touchmove', this);
				utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
				utils.removeEvent(window, 'mousemove', this);

				utils.removeEvent(window, 'touchend', this);
				utils.removeEvent(window, utils.prefixPointerEvent('pointerup'), this);
				utils.removeEvent(window, 'mouseup', this);
			}

			if (this.options.defaultScrollbars) {
				this.wrapper.parentNode.removeChild(this.wrapper);
			}
		},

		_start: function(e) {
			var point = e.touches ? e.touches[0] : e;

			e.preventDefault();
			e.stopPropagation();

			this.transitionTime();

			this.initiated = true;
			this.moved = false;
			this.lastPointX = point.pageX;
			this.lastPointY = point.pageY;

			this.startTime = utils.getTime();

			if (!this.options.disableTouch) {
				utils.addEvent(window, 'touchmove', this);
			}
			if (!this.options.disablePointer) {
				utils.addEvent(window, utils.prefixPointerEvent('pointermove'), this);
			}
			if (!this.options.disableMouse) {
				utils.addEvent(window, 'mousemove', this);
			}

			this.scroller._execEvent('beforeScrollStart');
		},

		_move: function(e) {
			var point = e.touches ? e.touches[0] : e,
				deltaX, deltaY,
				newX, newY,
				timestamp = utils.getTime();

			if (!this.moved) {
				this.scroller._execEvent('scrollStart');
			}

			this.moved = true;

			deltaX = point.pageX - this.lastPointX;
			this.lastPointX = point.pageX;

			deltaY = point.pageY - this.lastPointY;
			this.lastPointY = point.pageY;

			newX = this.x + deltaX;
			newY = this.y + deltaY;

			this._pos(newX, newY);


			if (this.scroller.options.probeType == 1 && timestamp - this.startTime > 300) {
				this.startTime = timestamp;
				this.scroller._execEvent('scroll');
			} else if (this.scroller.options.probeType > 1) {
				this.scroller._execEvent('scroll');
			}


			// INSERT POINT: indicator._move

			e.preventDefault();
			e.stopPropagation();
		},

		_end: function(e) {
			if (!this.initiated) {
				return;
			}

			this.initiated = false;

			e.preventDefault();
			e.stopPropagation();

			utils.removeEvent(window, 'touchmove', this);
			utils.removeEvent(window, utils.prefixPointerEvent('pointermove'), this);
			utils.removeEvent(window, 'mousemove', this);

			if (this.scroller.options.snap) {
				var snap = this.scroller._nearestSnap(this.scroller.x, this.scroller.y);

				var time = this.options.snapSpeed || Math.max(
					Math.max(
						Math.min(Math.abs(this.scroller.x - snap.x), 1000),
						Math.min(Math.abs(this.scroller.y - snap.y), 1000)
					), 300);

				if (this.scroller.x != snap.x || this.scroller.y != snap.y) {
					this.scroller.directionX = 0;
					this.scroller.directionY = 0;
					this.scroller.currentPage = snap;
					this.scroller.scrollTo(snap.x, snap.y, time, this.scroller.options.bounceEasing);
				}
			}

			if (this.moved) {
				this.scroller._execEvent('scrollEnd');
			}
		},

		transitionTime: function(time) {
			time = time || 0;
			this.indicatorStyle[utils.style.transitionDuration] = time + 'ms';

			if (!time && utils.isBadAndroid) {
				this.indicatorStyle[utils.style.transitionDuration] = '0.001s';
			}
		},

		transitionTimingFunction: function(easing) {
			this.indicatorStyle[utils.style.transitionTimingFunction] = easing;
		},

		refresh: function() {
			this.transitionTime();

			if (this.options.listenX && !this.options.listenY) {
				this.indicatorStyle.display = this.scroller.hasHorizontalScroll ? 'block' : 'none';
			} else if (this.options.listenY && !this.options.listenX) {
				this.indicatorStyle.display = this.scroller.hasVerticalScroll ? 'block' : 'none';
			} else {
				this.indicatorStyle.display = this.scroller.hasHorizontalScroll || this.scroller.hasVerticalScroll ? 'block' : 'none';
			}

			if (this.scroller.hasHorizontalScroll && this.scroller.hasVerticalScroll) {
				utils.addClass(this.wrapper, 'iScrollBothScrollbars');
				utils.removeClass(this.wrapper, 'iScrollLoneScrollbar');

				if (this.options.defaultScrollbars && this.options.customStyle) {
					if (this.options.listenX) {
						this.wrapper.style.right = '8px';
					} else {
						this.wrapper.style.bottom = '8px';
					}
				}
			} else {
				utils.removeClass(this.wrapper, 'iScrollBothScrollbars');
				utils.addClass(this.wrapper, 'iScrollLoneScrollbar');

				if (this.options.defaultScrollbars && this.options.customStyle) {
					if (this.options.listenX) {
						this.wrapper.style.right = '2px';
					} else {
						this.wrapper.style.bottom = '2px';
					}
				}
			}

			var r = this.wrapper.offsetHeight; // force refresh

			if (this.options.listenX) {
				this.wrapperWidth = this.wrapper.clientWidth;
				if (this.options.resize) {
					this.indicatorWidth = Math.max(Math.round(this.wrapperWidth * this.wrapperWidth / (this.scroller.scrollerWidth || this.wrapperWidth || 1)), 8);
					this.indicatorStyle.width = this.indicatorWidth + 'px';
				} else {
					this.indicatorWidth = this.indicator.clientWidth;
				}

				this.maxPosX = this.wrapperWidth - this.indicatorWidth;

				if (this.options.shrink == 'clip') {
					this.minBoundaryX = -this.indicatorWidth + 8;
					this.maxBoundaryX = this.wrapperWidth - 8;
				} else {
					this.minBoundaryX = 0;
					this.maxBoundaryX = this.maxPosX;
				}

				this.sizeRatioX = this.options.speedRatioX || (this.scroller.maxScrollX && (this.maxPosX / this.scroller.maxScrollX));
			}

			if (this.options.listenY) {
				this.wrapperHeight = this.wrapper.clientHeight;
				if (this.options.resize) {
					this.indicatorHeight = Math.max(Math.round(this.wrapperHeight * this.wrapperHeight / (this.scroller.scrollerHeight || this.wrapperHeight || 1)), 8);
					this.indicatorStyle.height = this.indicatorHeight + 'px';
				} else {
					this.indicatorHeight = this.indicator.clientHeight;
				}

				this.maxPosY = this.wrapperHeight - this.indicatorHeight;

				if (this.options.shrink == 'clip') {
					this.minBoundaryY = -this.indicatorHeight + 8;
					this.maxBoundaryY = this.wrapperHeight - 8;
				} else {
					this.minBoundaryY = 0;
					this.maxBoundaryY = this.maxPosY;
				}

				this.maxPosY = this.wrapperHeight - this.indicatorHeight;
				this.sizeRatioY = this.options.speedRatioY || (this.scroller.maxScrollY && (this.maxPosY / this.scroller.maxScrollY));
			}

			this.updatePosition();
		},

		updatePosition: function() {
			var x = this.options.listenX && Math.round(this.sizeRatioX * this.scroller.x) || 0,
				y = this.options.listenY && Math.round(this.sizeRatioY * this.scroller.y) || 0;

			if (!this.options.ignoreBoundaries) {
				if (x < this.minBoundaryX) {
					if (this.options.shrink == 'scale') {
						this.width = Math.max(this.indicatorWidth + x, 8);
						this.indicatorStyle.width = this.width + 'px';
					}
					x = this.minBoundaryX;
				} else if (x > this.maxBoundaryX) {
					if (this.options.shrink == 'scale') {
						this.width = Math.max(this.indicatorWidth - (x - this.maxPosX), 8);
						this.indicatorStyle.width = this.width + 'px';
						x = this.maxPosX + this.indicatorWidth - this.width;
					} else {
						x = this.maxBoundaryX;
					}
				} else if (this.options.shrink == 'scale' && this.width != this.indicatorWidth) {
					this.width = this.indicatorWidth;
					this.indicatorStyle.width = this.width + 'px';
				}

				if (y < this.minBoundaryY) {
					if (this.options.shrink == 'scale') {
						this.height = Math.max(this.indicatorHeight + y * 3, 8);
						this.indicatorStyle.height = this.height + 'px';
					}
					y = this.minBoundaryY;
				} else if (y > this.maxBoundaryY) {
					if (this.options.shrink == 'scale') {
						this.height = Math.max(this.indicatorHeight - (y - this.maxPosY) * 3, 8);
						this.indicatorStyle.height = this.height + 'px';
						y = this.maxPosY + this.indicatorHeight - this.height;
					} else {
						y = this.maxBoundaryY;
					}
				} else if (this.options.shrink == 'scale' && this.height != this.indicatorHeight) {
					this.height = this.indicatorHeight;
					this.indicatorStyle.height = this.height + 'px';
				}
			}

			this.x = x;
			this.y = y;

			if (this.scroller.options.useTransform) {
				this.indicatorStyle[utils.style.transform] = 'translate(' + x + 'px,' + y + 'px)' + this.scroller.translateZ;
			} else {
				this.indicatorStyle.left = x + 'px';
				this.indicatorStyle.top = y + 'px';
			}
		},

		_pos: function(x, y) {
			if (x < 0) {
				x = 0;
			} else if (x > this.maxPosX) {
				x = this.maxPosX;
			}

			if (y < 0) {
				y = 0;
			} else if (y > this.maxPosY) {
				y = this.maxPosY;
			}

			x = this.options.listenX ? Math.round(x / this.sizeRatioX) : this.scroller.x;
			y = this.options.listenY ? Math.round(y / this.sizeRatioY) : this.scroller.y;

			this.scroller.scrollTo(x, y);
		},

		fade: function(val, hold) {
			if (hold && !this.visible) {
				return;
			}

			clearTimeout(this.fadeTimeout);
			this.fadeTimeout = null;

			var time = val ? 250 : 500,
				delay = val ? 0 : 300;

			val = val ? '1' : '0';

			this.wrapperStyle[utils.style.transitionDuration] = time + 'ms';

			this.fadeTimeout = setTimeout((function(val) {
				this.wrapperStyle.opacity = val;
				this.visible = +val;
			}).bind(this, val), delay);
		}
	};

	IScroll.utils = utils;

	if (typeof module != 'undefined' && module.exports) {
		module.exports = IScroll;
	} else {
		window.IScroll = IScroll;
	}

})(window, document, Math);
/*===============================================================================
************   zepto extend   ************
===============================================================================*/
;
(function($) {
    var isTouch = !!(('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch)
    var unique = function(arr) {
        var unique = [];
        for (var i = 0; i < arr.length; i++) {
            if (unique.indexOf(arr[i]) === -1) unique.push(arr[i]);
        }
        return unique;
    };
    // Transforms
    $.fn.transform = function(transform) {
        for (var i = 0; i < this.length; i++) {
            var elStyle = this[i].style;
            elStyle.webkitTransform = elStyle.MsTransform = elStyle.msTransform = elStyle.MozTransform = elStyle.OTransform = elStyle.transform = transform;
        }
        return this;
    };
    $.fn.transition = function(duration) {
        if (typeof duration !== 'string') {
            duration = duration + 'ms';
        }
        for (var i = 0; i < this.length; i++) {
            var elStyle = this[i].style;
            elStyle.webkitTransitionDuration = elStyle.MsTransitionDuration = elStyle.msTransitionDuration = elStyle.MozTransitionDuration = elStyle.OTransitionDuration = elStyle.transitionDuration = duration;
        }
        return this;
    };
    $.fn.transitionEnd = function(callback) {
        var events = ['webkitTransitionEnd', 'transitionend', 'oTransitionEnd', 'MSTransitionEnd', 'msTransitionEnd'],
            i, j, dom = this;

        function fireCallBack(e) {
            /*jshint validthis:true */
            if (e.target !== this) return;
            callback.call(this, e);
            for (i = 0; i < events.length; i++) {
                dom.off(events[i], fireCallBack);
            }
        }
        if (callback) {
            for (i = 0; i < events.length; i++) {
                dom.on(events[i], fireCallBack);
            }
        }
        return this;
    };
    $.fn.animationEnd = function(callback) {
        var events = ['webkitAnimationEnd', 'OAnimationEnd', 'MSAnimationEnd', 'animationend'],
            i, j, dom = this;

        function fireCallBack(e) {
            callback(e);
            for (i = 0; i < events.length; i++) {
                dom.off(events[i], fireCallBack);
            }
        }
        if (callback) {
            for (i = 0; i < events.length; i++) {
                dom.on(events[i], fireCallBack);
            }
        }
        return this;
    }
    $.fn.outerWidth = function(includeMargins) {
        if (this.length > 0) {
            if (includeMargins) {
                var styles = this.styles();
                return this[0].offsetWidth + parseFloat(styles.getPropertyValue('margin-right')) + parseFloat(styles.getPropertyValue('margin-left'));
            } else
                return this[0].offsetWidth;
        } else return null;
    }
    $.fn.outerHeight = function(includeMargins) {
        if (this.length > 0) {
            if (includeMargins) {
                var styles = this.styles();
                return this[0].offsetHeight + parseFloat(styles.getPropertyValue('margin-top')) + parseFloat(styles.getPropertyValue('margin-bottom'));
            } else
                return this[0].offsetHeight;
        } else return null;
    }

    $.fn.is = function(selector) {
        if (!this[0] || typeof selector === 'undefined') return false;
        var compareWith, i;
        if (typeof selector === 'string') {
            var el = this[0];
            if (el === document) return selector === document;
            if (el === window) return selector === window;

            if (el.matches) return el.matches(selector);
            else if (el.webkitMatchesSelector) return el.webkitMatchesSelector(selector);
            else if (el.mozMatchesSelector) return el.mozMatchesSelector(selector);
            else if (el.msMatchesSelector) return el.msMatchesSelector(selector);
            else {
                compareWith = $(selector);
                for (i = 0; i < compareWith.length; i++) {
                    if (compareWith[i] === this[0]) return true;
                }
                return false;
            }
        } else if (selector === document) return this[0] === document;
        else if (selector === window) return this[0] === window;
        else {
            if (selector.nodeType || selector instanceof Zepto) {
                compareWith = selector.nodeType ? [selector] : selector;
                for (i = 0; i < compareWith.length; i++) {
                    if (compareWith[i] === this[0]) return true;
                }
                return false;
            }
            return false;
        }

    }

    $.fn.button = function(callback) {

        var self = this;
        self.on(isTouch ? "tap" : "click", function(evt) {
            var ele = evt.currentTarget;
            if ($.isFunction(callback)) {
                callback.apply(self, [ele, evt]);
            }
        });
        return self;
    };


    ['checkbox', 'radio'].forEach(function(eventName) {
        $.fn[eventName] = function(callback) {
            var self = this;
            var els = eventName == 'checkbox' ? self.find('input[type=checkbox]') : self.find('input[type=radio]');
            els.on('change', function(evt) {
                var ele = evt.currentTarget;
                if ($.isFunction(callback)) {
                    callback.apply(self, [ele, evt]);
                }
            });
            return self;
        }
    });

    $.fn.select = function(callback) {
        var self = this;
        self.find('select').on("change", function(evt) {
            var sel = evt.currentTarget;
            if ($.isFunction(callback)) {
                callback.apply(self, [sel.options[sel.selectedIndex], evt]);
            }
        });
        return self;
    };

    $.fn.children = function(selector) {
        var children = [];
        for (var i = 0; i < this.length; i++) {
            var childNodes = this[i].childNodes;

            for (var j = 0; j < childNodes.length; j++) {
                var node = childNodes[j];
                if (!selector) {
                    if (node.nodeType === 1 && node.nodeName.toUpperCase() !== 'SCRIPT') children.push(childNodes[j]);
                } else {
                    if (node.nodeType === 1 && node.nodeName.toUpperCase() !== 'SCRIPT' && $(node).is(selector)) children.push(node);
                }
            }
        }
        return $(unique(children));
    }
}($));
/*===============================================================================
************   $ extend   ************
===============================================================================*/
;
(function($) {
    $.animationFrame = function(cb) {
        var args, isQueued, context;
        return function() {
            args = arguments;
            context = this;
            if (!isQueued) {
                isQueued = true;
                requestAnimationFrame(function() {
                    cb.apply(context, args);
                    isQueued = false;
                });
            }
        };
    };

    $.trimLeft = function(str) {
        return str == null ? "" : String.prototype.trimLeft.call(str)
    };
    $.trimRight = function(str) {
        return str == null ? "" : String.prototype.trimRight.call(str)
    };
    $.trimAll = function(str) {
        return str == null ? "" : str.replace(/\s*/g, '');
    };
    $.cellPhone = function(v) {
        var cellphone = /^1[3|4|5|8][0-9]\d{8}$/;
        return cellphone.test(v);
    };
    $.email = function(v) {
        var email = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/i;
        return email.test(v);
    };
    //全数字
    $.isDigit = function(v) {
        var patrn = /^[0-9]{1,20}$/;
        return patrn.test(v);
    };

    //校验登录名：只能输入5-20个以字母开头、可带数字、“_”、“.”的字串 
    $.isRegisterUserName = function(v) {
        var patrn = /^[a-zA-Z]{1}([a-zA-Z0-9]|[._]){4,19}$/;
        return patrn.test(v);
    };

    //校验密码：只能输入6-20个字母、数字、下划线   
    $.registerPasswd = function(v) {
        var patrn = /^(\w){6,20}$/;
        return patrn.test(v);
    };
    // 至少一个小写字母
    $.charOne = function(v) {
        var patrn = /[a-z]/;
        return patrn.test(v);
    };
    // 至少一个大写字母
    $.upperCharOne = function(v) {
        var patrn = /[A-Z]/;
        return patrn.test(v);
    };

    $.idcard = function(num) {
        num = num.toUpperCase();
        if (!(/(^\d{15}$)|(^\d{17}([0-9]|X)$)/.test(num))) {
            //            alert('输入的身份证号长度不对，或者号码不符合规定！\n15位号码应全为数字，18位号码末位可以为数字或X。 ');
            return false;
        }
        // 校验位按照ISO 7064:1983.MOD 11-2的规定生成，X可以认为是数字10。
        // 下面分别分析出生日期和校验位
        var len, re;
        len = num.length;
        if (len == 15) {
            re = new RegExp(/^(\d{6})(\d{2})(\d{2})(\d{2})(\d{3})$/);
            var arrSplit = num.match(re); // 检查生日日期是否正确
            var dtmBirth = new Date('19' + arrSplit[2] + '/' + arrSplit[3] + '/' + arrSplit[4]);
            var bGoodDay;
            bGoodDay = (dtmBirth.getYear() == Number(arrSplit[2])) && ((dtmBirth.getMonth() + 1) == Number(arrSplit[3])) && (dtmBirth.getDate() == Number(arrSplit[4]));
            if (!bGoodDay) {
                //                alert('输入的身份证号里出生日期不对！');
                return false;
            } else { // 将15位身份证转成18位 //校验位按照ISO 7064:1983.MOD
                // 11-2的规定生成，X可以认为是数字10。
                var arrInt = new Array(7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2);
                var arrCh = new Array('1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2');
                var nTemp = 0,
                    i;
                num = num.substr(0, 6) + '19' + num.substr(6, num.length - 6);
                for (i = 0; i < 17; i++) {
                    nTemp += num.substr(i, 1) * arrInt[i];
                }
                num += arrCh[nTemp % 11];
                return true;
            }
        }
        if (len == 18) {
            re = new RegExp(/^(\d{6})(\d{4})(\d{2})(\d{2})(\d{3})([0-9]|X)$/);
            var arrSplit = num.match(re); // 检查生日日期是否正确
            var dtmBirth = new Date(arrSplit[2] + "/" + arrSplit[3] + "/" + arrSplit[4]);
            var bGoodDay;
            bGoodDay = (dtmBirth.getFullYear() == Number(arrSplit[2])) && ((dtmBirth.getMonth() + 1) == Number(arrSplit[3])) && (dtmBirth.getDate() == Number(arrSplit[4]));
            if (!bGoodDay) {
                //                alert('输入的身份证号里出生日期不对！');
                return false;
            } else { // 检验18位身份证的校验码是否正确。 //校验位按照ISO 7064:1983.MOD
                // 11-2的规定生成，X可以认为是数字10。
                var valnum;
                var arrInt = new Array(7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2);
                var arrCh = new Array('1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2');
                var nTemp = 0,
                    i;
                for (i = 0; i < 17; i++) {
                    nTemp += num.substr(i, 1) * arrInt[i];
                }
                valnum = arrCh[nTemp % 11];
                if (valnum != num.substr(17, 1)) {
                    //                    alert('18位身份证的校验码不正确！应该为：' + valnum);
                    return false;
                }
                return true;
            }
        }

        return false;
    };
    //获取字符串的字节长度
    $.getBytesLength = function(str) {
        if (!str) {
            return 0;
        }
        var totalLength = 0;
        var charCode;
        var len = str.length
        for (var i = 0; i < len; i++) {
            charCode = str.charCodeAt(i);
            if (charCode < 0x007f) {
                totalLength++;
            } else if ((0x0080 <= charCode) && (charCode <= 0x07ff)) {
                totalLength += 2;
            } else if ((0x0800 <= charCode) && (charCode <= 0xffff)) {
                totalLength += 3;
            } else {
                totalLength += 4;
            }
        }
        return totalLength;
    };

    $.chk = function(obj) {
        return !!((obj && obj !== 'null' && obj !== 'undefined') || obj === 0);
    };

}($));
/*===============================================================================
************   $ extend end  ************
************   $ dateFormat begin  ************
===============================================================================*/

(function($) {
    /**
     * dataFormat工具类接口
     */
    // 下面是日期的format的格式转换的规则
    /*
    Full Form和Short Form之间可以实现笛卡尔积式的搭配

     Field        | Full Form          | Short Form                            中文日期，所有Full Form 不处理(除了年)
     -------------+--------------------+-----------------------
     Year         | yyyy (4 digits)    | yy (2 digits), y (2 or 4 digits)      NNNN  NN  N
     Month        | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)      Y
                  | NNN (abbr.)        |
     Day of Month | dd (2 digits)      | d (1 or 2 digits)                     R
     Day of Week  | EE (name)          | E (abbr)
     Hour (1-12)  | hh (2 digits)      | h (1 or 2 digits)                     S
     Hour (0-23)  | HH (2 digits)      | H (1 or 2 digits)                     T
     Hour (0-11)  | KK (2 digits)      | K (1 or 2 digits)                     U
     Hour (1-24)  | kk (2 digits)      | k (1 or 2 digits)                     V
     Minute       | mm (2 digits)      | m (1 or 2 digits)                     F
     Second       | ss (2 digits)      | s (1 or 2 digits)                     W
     AM/PM        | a                  |

     */
    //
    //例子
    //dataFormat.formatDateToString(new Date(),"yyyymmdd");//
    //dataFormat.formatStringToDate("1992_09_22","yyyy_mm_dd");
    //dataFormat.formatStringToString("1992_09_22","yyyy_mm_dd","yy______mmdd");
    //dataFormat.compareDates("1992_09_22","yyyy_mm_dd","1992_09_23","yyyy_mm_dd");//返回false
    //dataFormat.isDate("1992_09_________22","yyyy_mm_________dd");//返回true
    //
    var dataFormat = {
        MONTH_NAMES: new Array('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ),
        DAY_NAMES: new Array('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
            'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
        ),
        //    chi : [ '一', '二', '三', '四', '五', '六', '七', '八', '九','十'],
        toChi: function(year) { //转换中文，不进位   //todo 需要优化为一条正则表达式
            return year.replace(/0/g, '零').replace(/1/g, '一').
            replace(/2/g, '二').replace(/3/g, '三').replace(/4/g, '四')
                .replace(/5/g, '五').replace(/6/g, '六').replace(/7/g, '七')
                .replace(/8/g, '八').replace(/9/g, '九');
        },

        toChiNum: function(n) { //转换中文，进位,只支持到十位数
            var num = n / 1;
            var num_s = num + '';
            if (num > 9 && num < 20) {
                num_s = '十' + num_s.charAt(1);
            } else if (num > 19) {
                num_s = num_s.charAt(0) + '十' + num_s.charAt(1);
            }
            num_s = this.toChi(num_s);
            if (num != 0) num_s = num_s.replace(/零/g, '');
            return num_s;
        },
        toNum: function(year) { //中文转换阿拉伯数字，纯替换  //todo 需要优化为一条正则表达式
            return year.replace(/零/g, '0').replace(/一/g, '1').
            replace(/二/g, '2').replace(/三/g, '3').replace(/四/g, '4')
                .replace(/五/g, '5').replace(/六/g, '6').replace(/七/g, '7')
                .replace(/八/g, '8').replace(/九/g, '9');
        },
        toNum2: function(year) { //中文转换阿拉伯数字，带进位，支持2位数 //todo 需要优化为一条正则表达式
            var l = year.length;
            if (year == '十') return 10;
            if (l == 1 && '十' != year) return this.toNum(year); //零 到 九
            if (l == 2 && '十' != year.charAt(l - 1)) return this.toNum(year.replace(/十/g, '一')); //十一 到 十九
            if (l == 2 && '十' == year.charAt(l - 1)) return this.toNum(year.replace(/十/g, '零')); //二十 到 九十 的整数
            if (l == 3) return this.toNum(year.replace(/十/g, '')); //二十一 到 九十九 的三位中文数字
        },

        LZ: function(x) {
            return (x < 0 || x > 9 ? "" : "0") + x;
        },
        isDate: function(val, format) { //看看给定的字符串是否为Date类型
            var date = this.formatStringToDate(val, format);
            if (date == 0) {
                return false;
            }
            return true;
        },
        compareDates: function(date1, dateformat1, date2, dateformat2) { //比较大小
            var d1 = this.formatStringToDate(date1, dateformat1);
            var d2 = this.formatStringToDate(date2, dateformat2);
            if (d1 == 0 || d2 == 0) {
                alert("format格式转换有问题");
                return;
            } else if (d1 > d2) {
                return true;
            }
            return false;
        },
        formatDateToString: function(date, format) { //将日期转化为Str
            //赋值
            format = format + "";
            var result = ""; //返回的结果字符串
            var i_format = 0; //format字符串的位置指针
            var c = "";
            var token = ""; //format字符串中的子串
            var y = date.getFullYear() + "";
            var M = date.getMonth() + 1;
            var d = date.getDate();
            var E = date.getDay();
            var H = date.getHours();
            var m = date.getMinutes();
            var s = date.getSeconds();
            var yyyy, yy, MMM, MM, dd, hh, h, mm, ss, ampm, HH, H, KK, K, kk, k;

            //将所有的规则的key加入到value对象的key中,将传入的date取出来的值加入到value对象的value中
            var value = new Object();
            value["y"] = "" + y;
            value["yyyy"] = y;
            value["yy"] = y.substring(2, 4);

            value["M"] = M;
            value["MM"] = this.LZ(M);
            value["MMM"] = this.MONTH_NAMES[M - 1];
            value["NNN"] = this.MONTH_NAMES[M + 11];

            value["d"] = d;
            value["dd"] = this.LZ(d);
            value["E"] = this.DAY_NAMES[E + 7];
            value["EE"] = this.DAY_NAMES[E];

            value["H"] = H;
            value["HH"] = this.LZ(H);
            if (H == 0) {
                value["h"] = 12;
            } else if (H > 12) {
                value["h"] = H - 12;
            } else {
                value["h"] = H;
            }
            value["hh"] = this.LZ(value["h"]);
            if (H > 11) {
                value["K"] = H - 12;
            } else {
                value["K"] = H;
            }
            value["k"] = H + 1;
            value["KK"] = this.LZ(value["K"]);
            value["kk"] = this.LZ(value["k"]);

            if (H > 11) {
                value["a"] = "PM";
            } else {
                value["a"] = "AM";
            }

            value["m"] = m;
            value["mm"] = this.LZ(m);

            value["s"] = s;
            value["ss"] = this.LZ(s);

            value["NNNN"] = this.toChi(value["yyyy"]);
            value["NN"] = this.toChi(value["yy"]);
            value["N"] = this.toChi(value["y"]);
            value["Y"] = this.toChiNum(M);
            value["R"] = this.toChiNum(d);
            value["S"] = this.toChiNum(value["h"]);
            value["T"] = this.toChiNum(value["H"]);
            value["U"] = this.toChiNum(value["K"]);
            value["V"] = this.toChiNum(value["k"]);
            value["F"] = this.toChiNum(m);
            value["W"] = this.toChiNum(s);


            //开始进行校验
            while (i_format < format.length) { //以i_format为记录解析format的指针,进行遍历
                c = format.charAt(i_format);
                token = "";
                while ((format.charAt(i_format) == c) && (i_format < format.length)) { //当进行遍历的字符相同的时候,token取的就是当前遍历的相同字符,例如yyyy mm dd,这里就是三个循环yyyy mm dd
                    token += format.charAt(i_format++);
                }
                if (value[token] != null) {
                    result = result + value[token]; //循环叠加value
                } else {
                    result = result + token;
                }
            }
            return result; //最后返回格式化的字符串
        },
        _isInteger: function(val) {
            //return ['0','1','2','3','4','5','6','7','8','9'].contains(val);
            var digits = "1234567890";
            for (var i = 0; i < val.length; i++) {
                if (digits.indexOf(val.charAt(i)) == -1) {
                    return false;
                }
            }
            return true;
        },
        _isInteger_chi: function(val) {
            //return ['0','1','2','3','4','5','6','7','8','9'].contains(val);
            var digits = "零一二三四五六七八九十";
            for (var i = 0; i < val.length; i++) {
                if (digits.indexOf(val.charAt(i)) == -1) {
                    return false;
                }
            }
            return true;
        },
        _getInt: function(str, i, minlength, maxlength) {
            for (var x = maxlength; x >= minlength; x--) {
                var token = str.substring(i, i + x);
                if (token.length < minlength) {
                    return null;
                }
                if (this._isInteger(token)) {
                    return token;
                }
            }
            return null;
        },
        _getInt2: function(str, i, minlength, maxlength) {
            for (var x = maxlength; x >= minlength; x--) {
                var token = str.substring(i, i + x);
                if (token.length < minlength) {
                    return null;
                }
                if (token) {
                    return token;
                }
            }
            return null;
        },

        _getInt_month: function(str, i) {
            for (var x = 2; x >= 1; x--) {
                var token = str.substring(i, i + x);
                if (token.length < 1) {
                    return null;
                }
                if (token.length == 1) {
                    return token;
                }
                if (['十一', '十二'].contains(token)) {
                    return token;
                }
            }
            return null;
        },

        _getInt_date: function(str, i) {
            for (var x = 3; x >= 1; x--) {
                var token = str.substring(i, i + x);
                if (token.length < 1) {
                    return null;
                }
                if (token.length == 1) return token;
                if (this._isInteger_chi(token)) return token;
            }
            return null;
        },
        formatStringToDate: function(val, format) { //将字符串转化为Date
            //赋值
            val = val + "";
            format = format + "";
            var i_val = 0; //val字符串的指针
            var i_format = 0; //format字符串的指针
            var c = "";
            var token = "";
            var token2 = "";
            var x, y;
            var now = new Date();
            var year = now.getFullYear();
            var month = now.getMonth() + 1;
            var date = 1;
            var hh = now.getHours();
            var mm = now.getMinutes();
            var ss = now.getSeconds();
            var ampm = "";

            while (i_format < format.length) {
                //根据类似yyyy,mm同名的字符串的规则,可以取得yyyy或者mm等format字符串
                c = format.charAt(i_format);
                token = "";
                while ((format.charAt(i_format) == c) && (i_format < format.length)) {
                    token += format.charAt(i_format++);
                }
                //从val中通过format中的token解析,进行规则转换
                if (token == "NNNN" || token == "NN" || token == "N") { //年 中文
                    if (token == "NNNN") {
                        x = 4;
                        y = 4;
                    }
                    if (token == "NN") {
                        x = 2;
                        y = 2;
                    }
                    if (token == "N") {
                        x = 2;
                        y = 4;
                    }
                    year = this._getInt2(val, i_val, x, y); //从val字符串中根据val的指针i_val,定义的最小/大长度(如上面的y,它所允许的最大长度就是4,最小长度就是2,例如2009,09等)
                    if (year == null) {
                        return 0;
                    }
                    year = this.toNum(year);
                    i_val += year.length; //修改val的指针i_val,使其指向当前的变量
                    if (year.length == 2) { //年输入两位数的作用
                        if (year > 70) {
                            year = 1900 + (year - 0); //如果>70年的话,肯定不是现在了,加1900就行了
                        } else {
                            year = 2000 + (year - 0);
                        }
                    }
                } else if (token == "Y") { //月_数字_大写

                    month = this._getInt_month(val, i_val);
                    i_val += month.length;
                    month = this.toNum2(month);
                    if (month == null || (month < 1) || (month > 12)) {
                        return 0;
                    }

                } else if (token == "R") { //日 数字 中文

                    date = this._getInt_date(val, i_val);
                    i_val += date.length;
                    date = this.toNum2(date);
                    if (date == null || (date < 1) || (date > 31)) {
                        return 0;
                    }

                } else if (token == "S") { //小时 数字 中文 h
                    hh = this._getInt_date(val, i_val);
                    i_val += hh.length;
                    hh = this.toNum2(hh);
                    if (hh == null || (hh < 1) || (hh > 12)) {
                        return 0;
                    }
                } else if (token == "T") { //小时 数字 中文  H
                    hh = this._getInt_date(val, i_val);
                    i_val += hh.length;
                    hh = this.toNum2(hh);
                    if (hh == null || (hh < 0) || (hh > 23)) {
                        return 0;
                    }
                } else if (token == "U") { //小时 数字 中文 K
                    hh = this._getInt_date(val, i_val);
                    i_val += hh.length;
                    hh = this.toNum2(hh);
                    if (hh == null || (hh < 0) || (hh > 11)) {
                        return 0;
                    }
                } else if (token == "V") { //小时 数字 中文 k
                    hh = this._getInt_date(val, i_val);
                    i_val += hh.length;
                    hh = this.toNum2(hh);
                    hh--;
                    if (hh == null || (hh < 1) || (hh > 24)) {
                        return 0;
                    }
                } else if (token == "F") { //分 数字 中文
                    mm = this._getInt_date(val, i_val);
                    i_val += mm.length;
                    mm = this.toNum2(mm);
                    if (mm == null || (mm < 0) || (mm > 59)) {
                        return 0;
                    }
                } else if (token == "W") { //秒 数字 中文
                    ss = this._getInt_date(val, i_val);
                    i_val += ss.length;
                    ss = this.toNum2(ss);
                    if (ss == null || (ss < 0) || (ss > 59)) {
                        return 0;
                    }
                } else if (token == "yyyy" || token == "yy" || token == "y") { //年
                    if (token == "yyyy") {
                        x = 4;
                        y = 4;
                    }
                    if (token == "yy") {
                        x = 2;
                        y = 2;
                    }
                    if (token == "y") {
                        x = 2;
                        y = 4;
                    }
                    year = this._getInt(val, i_val, x, y); //从val字符串中根据val的指针i_val,定义的最小/大长度(如上面的y,它所允许的最大长度就是4,最小长度就是2,例如2009,09等)
                    if (year == null) {
                        return 0;
                    }
                    i_val += year.length; //修改val的指针i_val,使其指向当前的变量
                    if (year.length == 2) { //年输入两位数的作用
                        if (year > 70) {
                            year = 1900 + (year - 0); //如果>70年的话,肯定不是现在了,加1900就行了
                        } else {
                            year = 2000 + (year - 0);
                        }
                    }
                } else if (token == "MMM" || token == "NNN") { //月_name
                    month = 0;
                    for (var i = 0; i < this.MONTH_NAMES.length; i++) {
                        var month_name = this.MONTH_NAMES[i];
                        if (val.substring(i_val, i_val + month_name.length).toLowerCase() == month_name.toLowerCase()) { //如果指针指向的长度与this.MONTH_NAMES中的任何一项都相同
                            if (token == "MMM" || (token == "NNN" && i > 11)) {
                                month = i + 1; //将month转换为数字,+1是js中的month比实际的小1
                                if (month > 12) {
                                    month -= 12;
                                }
                                i_val += month_name.length;
                                break;
                            }
                        }
                    }
                    if ((month < 1) || (month > 12)) {
                        return 0;
                    } //不符合规则返回0
                } else if (token == "EE" || token == "E") { //日
                    for (var i = 0; i < this.DAY_NAMES.length; i++) {
                        var day_name = this.DAY_NAMES[i];
                        if (val.substring(i_val, i_val + day_name.length).toLowerCase() == day_name.toLowerCase()) {
                            i_val += day_name.length;
                            break;
                        }
                    }
                } else if (token == "MM" || token == "M") { //月_数字
                    month = this._getInt(val, i_val, token.length, 2);
                    if (month == null || (month < 1) || (month > 12)) {
                        return 0;
                    }
                    i_val += month.length;
                } else if (token == "dd" || token == "d") {
                    date = this._getInt(val, i_val, token.length, 2);
                    if (date == null || (date < 1) || (date > 31)) {
                        return 0;
                    }
                    i_val += date.length;
                } else if (token == "hh" || token == "h") {
                    hh = this._getInt(val, i_val, token.length, 2);
                    if (hh == null || (hh < 1) || (hh > 12)) {
                        return 0;
                    }
                    i_val += hh.length;
                } else if (token == "HH" || token == "H") {
                    hh = this._getInt(val, i_val, token.length, 2);
                    if (hh == null || (hh < 0) || (hh > 23)) {
                        return 0;
                    }
                    i_val += hh.length;
                } else if (token == "KK" || token == "K") {
                    hh = this._getInt(val, i_val, token.length, 2);
                    if (hh == null || (hh < 0) || (hh > 11)) {
                        return 0;
                    }
                    i_val += hh.length;
                } else if (token == "kk" || token == "k") {
                    hh = this._getInt(val, i_val, token.length, 2);
                    if (hh == null || (hh < 1) || (hh > 24)) {
                        return 0;
                    }
                    i_val += hh.length;
                    hh--;
                } else if (token == "mm" || token == "m") {
                    mm = this._getInt(val, i_val, token.length, 2);
                    if (mm == null || (mm < 0) || (mm > 59)) {
                        return 0;
                    }
                    i_val += mm.length;
                } else if (token == "ss" || token == "s") {
                    ss = this._getInt(val, i_val, token.length, 2);
                    if (ss == null || (ss < 0) || (ss > 59)) {
                        return 0;
                    }
                    i_val += ss.length;
                } else if (token == "a") { //上午下午
                    if (val.substring(i_val, i_val + 2).toLowerCase() == "am") {
                        ampm = "AM";
                    } else if (val.substring(i_val, i_val + 2).toLowerCase() == "pm") {
                        ampm = "PM";
                    } else {
                        return 0;
                    }
                    i_val += 2;
                } else { //最后,没有提供关键字的,将指针继续往下移
                    if (val.substring(i_val, i_val + token.length) != token) {
                        return 0;
                    } else {
                        i_val += token.length;
                    }
                }
            }
            //如果有其他的尾随字符导致字符串解析不下去了,那么返回0
            /*if (i_val != val.length) { return 0; }*/ //todo此处有问题
            //对于特殊月份:2月,偶数月的天数进行校验
            if (month == 2) {
                if (((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0)) { //测试是否是闰年
                    if (date > 29) {
                        return 0;
                    }
                } else {
                    if (date > 28) {
                        return 0;
                    }
                }
            }
            if ((month == 4) || (month == 6) || (month == 9) || (month == 11)) {
                if (date > 30) {
                    return 0;
                }
            }
            //对于上午下午的具体显示小时数,进行加减
            if (hh < 12 && ampm == "PM") {
                hh = hh - 0 + 12;
            } else if (hh > 11 && ampm == "AM") {
                hh -= 12;
            }

            //将给定的字符串解析成Data
            var newdate = new Date(year, month - 1, date, hh, mm, ss);
            return newdate;
        },
        formatStringToString: function(val, format1, format2) { //将一个字符串从原来的format1的字符串格式输出到format2字符格式
            var tempDate = this.formatStringToDate(val, format1);
            if (tempDate == 0) {
                return val;
            }
            var returnVal = this.formatDateToString(tempDate, format2);
            if (returnVal == 0) {
                return val;
            }
            return returnVal;
        }

    };

    $.formatStringToDate = function(val) { //将字符串转化为Date
        // return dataFormat.formatStringToDate(val, format);
        function getDate(strDate) {
            var date = eval('new Date(' + strDate.replace(/\d+(?=-[^-]+$)/,
                function(a) {
                    return parseInt(a, 10) - 1;
                }).match(/\d+/g) + ')');
            return date;
        }
        return getDate(val);
    };
    $.formatDateToString = function(date, format) { //将日期转化为Str
        !format && (format = 'yyyy-MM-dd HH:mm:ss');
        return dataFormat.formatDateToString(date, format);
    };

    $.getDays = function(format) { //获取当前时间
        return $.formatDateToString(new Date(), format);
    };

    $.milliseconds = function(str) {
        return $.formatStringToDate(str).getTime();
    };

    $.msToDateStr = function(ms, format) {
        return $.formatDateToString(new Date(ms), format);
    }

    $.daysBetween = function(startDate, endDate) {
        var res = $.getMilliseconds(startDate) - $.getMilliseconds(endDate);
        return Math.abs(res / 86400000);
    };
}($));

/*/*===============================================================================
************   $ dateFormat end  ************
===============================================================================*/
/**
 * @file 图片轮播组件
 */
;
(function() {

    var cssPrefix = $.fx.cssPrefix,
        transitionEnd = $.fx.transitionEnd;
    var CLASS_STATE_ACTIVE = 'ui-state-active',
        CLASS_SLIDER_DOTS = 'ui-slider-dots',
        CLASS_SLIDER_GROUP = 'ui-slider-group',
        CLASS_SLIDER_ITEM = 'ui-slider-item',
        CLASS_SLIDER_IMG = 'ui-slider-img',
        CLASS_SLIDER = 'ui-slider';

    /**
     * @property {Object}  容器的选择器
     */
    var SELECTOR_SLIDER_DOTS = '.' + CLASS_SLIDER_DOTS,
        SELECTOR_SLIDER_ITEM = '.' + CLASS_SLIDER_ITEM,
        SELECTOR_SLIDER_IMG = '.' + CLASS_SLIDER_IMG,
        SELECTOR_SLIDER_GROUP = '.' + CLASS_SLIDER_GROUP;
    var defDots = '<p class="' + CLASS_SLIDER_DOTS + '"><%= new Array( len + 1 )' +
        '.join("<b></b>") %></p>';
    var loading = '<div class="ui-loading">' +
        '<div class="ui-spinner">' +
        '</div>' +
        '</div>'

    // todo 检测3d是否支持。
    var transitionEnd, translateZ = ' translateZ(0)';

    var render = function() {
        var _sl = this,
            opts = _sl.opts,
            viewNum = opts.mulViewNum || 1,
            items,
            container;
        _sl.loading = $(loading).appendTo(_sl.ref);
        _sl.index = opts.index,
            // 检测容器节点是否指定
            container = _sl.ref.find(SELECTOR_SLIDER_GROUP);
        // 检测是否构成循环条件
        if ((items = container.children()).length < viewNum + 1) {
            opts.loop = false;
        }

        _sl.length = container.children().length;

        // 如果节点少了，需要复制几份
        while (opts.loop && container.children().length < 3 * viewNum) {
            container.append(items.clone());
        }

        _sl._items = (_sl._container = container)
            .children()
            .toArray();

        _sl._pages = container.find(SELECTOR_SLIDER_ITEM);

        _sl.ref.trigger('donedom');
        opts.dots && initDots.call(_sl);
        initWidth.call(_sl);
        // 转屏事件检测
        $(window).on('ortchange', function() {
            initWidth.call(_sl);
        });
    };

    var bind = function() {
        var _sl = this,
            opts = _sl.opts;
        _sl.ref.on('slideend', $.proxy(handleEvent, _sl))
            .on('touchstart', $.proxy(handleEvent, _sl))
            .on('touchend', $.proxy(handleEvent, _sl));
        //dots添加
        if (opts.dots) {
            _sl.ref.on('slide', function(evt, to, from) {
                updateDots.apply(_sl, [to, from]);
            })
        }
        _sl._container.on(transitionEnd,
            $.proxy(tansitionEnd, _sl));
    };

    var handleEvent = function(evt) {
        var _sl = this,
            opts = _sl.opts;
        // if (element.classList.contains(CLASS_DISABLED)) {
        //     return;
        // }
        switch (evt.type) {
            case 'touchstart':
                _sl.stop();
                break;
            case 'touchend':
            case 'touchcancel':
            case 'slideend':
                _sl.play();
                break;
        }
    };

    /**
     * 更新dots
     */
    var updateDots = function(to, from) {
        var _sl = this,
            dots = _sl._dots;

        typeof from === 'undefined' || $(dots[from % this.length]).removeClass(CLASS_STATE_ACTIVE);
        $(dots[to % this.length]).addClass(CLASS_STATE_ACTIVE);
    };

    var initDots = function() {
        var _sl = this,
            opts = _sl.opts;
        var dots = _sl.ref.find(SELECTOR_SLIDER_DOTS);

        if (!dots.length) {
            dots = _sl.parseTpl(defDots, {
                len: _sl.length
            });
            dots = $(dots).appendTo(_sl.ref[0]);
        }

        _sl._dots = dots.children().toArray();
        updateDots.call(_sl, _sl.index);
    };



    var initWidth = function() {
        var _sl = this,
            opts = _sl.opts,
            width;

        // width没有变化不需要重排
        if ((width = _sl.ref.width()) === _sl.width) {
            return;
        }
        _sl._container.css('display', 'block');
        if (opts.fullPage) {
            $(document.body).css('position', 'absolute');
              _sl.height = $(document.body).height();
        } else {
            if (opts.heightTarget == 'parent') {
                _sl.height = _sl.ref.parent().height();
            } else if (opts.heightTarget == 'img') {
                _sl.height = _sl._pages.find(SELECTOR_SLIDER_IMG).height();
            } else {
                _sl.height = _sl.ref.height();
            }

        }
        _sl.ref.height(_sl.height);
        _sl._pages.height(_sl.height);
        _sl._pages.find(SELECTOR_SLIDER_IMG).height(_sl.height);
        _sl.width = width;
        _sl.arrange();
        _sl.ref.find(SELECTOR_SLIDER_DOTS).css('display', 'block');
        _sl.ref.trigger('hiChange');
        _sl.loading.remove();
    };


    var tansitionEnd = function(evt) {
        var _sl = this,
            opts = _sl.opts;
        // ~~用来类型转换，等价于parseInt( str, 10 );
        if (~~evt.target.getAttribute('data-index') !== _sl.index) {
            return;
        }
        _sl.ref.trigger('slideend', [_sl.index]);
    };



    /**
     * 图片轮播组件
     */
    define(function($ui) {
        var $slider = $ui.define('Slider', {
            /**
             * @property {Boolean} [loop=false] 是否连续滑动
             * @namespace options
             */
            loop: false,

            /**
             * @property {Number} [speed=400] 动画执行速度
             * @namespace options
             */
            speed: 500,

            /**
             * @property {Number} [index=0] 初始位置
             * @namespace options
             */
            index: 0,
            /**
             * @property {Boolean} [autoPlay=true] 是否开启自动播放
             * @namespace options
             */
            autoPlay: false,
            /**
             * @property {Number} [interval=4000] 自动播放的间隔时间（毫秒）
             * @namespace options
             */
            interval: 4000,

            /**
             * @property {Boolean} [dots=true] 是否显示轮播点
             * @namespace options
             */
            dots: false,
            /**
             * @property {Boolean} [guide=true] 是否显示导向按钮
             * @namespace options
             */
            guide: false,
            /**
             * @property {Boolean} [gestur=true] 是否添加手势事件。
             * @namespace options
             */
            gestur: false,
            touch: true,
            /**
             * @property {Number} [mulViewNum=2] 当slider为multiview模式时，用来指定一页显示多少个图片。
             * @namespace options
             */
            mulViewNum: 1,
            /**
             * @property {Number} [space=10] 图片之间的间隔
             * @namespace options
             */
            space: 0,
            /**
             * @property {Number} [space=10f] 是否全屏显示
             * @namespace options
             */
            fullPage: false,
            /**
             * @property {Number} [space=10f] 高度目标 parent/self
             * @namespace options
             */
            heightTarget: 'self'

        });
        //初始化
        $slider.prototype.init = function() {
            var _sl = this,
                opts = _sl.opts;
            if (opts.mulViewNum > 1) {
                //加載多图显示功能
                _sl.register('sMultiview', function(sm) {
                    sm.call(_sl);
                    opts.travelSize = 1;
                    // 初始dom结构
                    render.call(_sl);
                    //绑定事件
                    bind.call(_sl);
                    //自动轮播
                    opts.autoPlay && _sl.play();
                });
            } else {
                // 初始dom结构
                render.call(_sl);
                //绑定事件
                bind.call(_sl);
                //自动轮播
                opts.autoPlay && _sl.play();
            }
            
            //加載觸摸按鈕
            if (opts.touch && ($.os.ios || $.os.android)) {
                _sl.register('sTouch', function(st) {
                    st.call(_sl);
                });
            }
            opts.guide = true;
            if (opts.guide) {
                _sl.register('sGuide', function(sg) {
                    sg.call(_sl);
                });
            }
            if (opts.gestur && ($.os.ios || $.os.android)) {
                _sl.register('sGestures', function(gt) {
                    gt.call(_sl);
                });
            }
        };



        // 重排items
        $slider.prototype.arrange = function() {
            var _sl = this,
                opts = _sl.opts,
                items = _sl._items,
                i = 0,
                item,
                len;

            _sl._slidePos = new Array(items.length);

            for (len = items.length; i < len; i++) {
                item = items[i];

                item.style.cssText += 'width:' + _sl.width + 'px;' + 'margin-right:' + opts.space + 'px;' +
                    'left:' + (i * (-_sl.width - opts.space)) + 'px;';
                item.setAttribute('data-index', i);

                _sl.move(i, i < _sl.index ? -_sl.width : i > _sl.index ? _sl.width : 0, 0);
            }

            _sl._container.css('width', (_sl.width + opts.space) * len);
        };

        /**
         * 自动播放。
         */
        $slider.prototype.play = function() {
            var _sl = this,
                opts = _sl.opts;
            opts.autoPlay = true;
            if (!_sl._timer) {
                _sl._timer = setTimeout(function() {
                    _sl.slideTo(_sl.index + 1);
                    _sl._timer = null;
                }, opts.interval);
            }
            return _sl;
        };

        /**
         * 停止自动播放
         * @method stop
         * @chainable
         * @return {self} 返回本身
         * @for Slider
         * @uses Slider.autoplay
         */
        $slider.prototype.stop = function() {
            var _sl = this,
                opts = _sl.opts;
            opts.autoPlay = false;
            if (_sl._timer) {
                clearTimeout(_sl._timer);
                _sl._timer = null;
            }
            return _sl;
        };


        /**
         * 切换到下一个slide
         * @method next
         * @chainable
         * @return {self} 返回本身
         */
        $slider.prototype.next = function() {
            var _sl = this,
                opts = _sl.opts;
            if (opts.loop || _sl.index + 1 < _sl.length) {
                _sl.slideTo(_sl.index + 1);
            }

            return _sl;
        };
        /**
         * 切换到上一个slide
         * @method prev
         * @chainable
         * @return {self} 返回本身
         */
        $slider.prototype.prev = function() {
            var _sl = this,
                opts = _sl.opts;
            if (opts.loop || _sl.index > 0) {
                _sl.slideTo(_sl.index - 1);
            }

            return _sl;
        };

        
        
        $slider.prototype.move = function(index, dist, speed, immediate) {
            var _sl = this,
                opts = _sl.opts,
                slidePos = _sl._slidePos,
                items = _sl._items;

            if (slidePos[index] === dist || !items[index]) {
                return;
            }

            _sl.translate(index, dist, speed);
            slidePos[index] = dist; // 记录目标位置

            // 强制一个reflow
            immediate && items[index].clientLeft;
        };

        $slider.prototype.translate = function(index, dist, speed) {
            var _sl = this,
                opts = _sl.opts,
                slide = _sl._items[index],
                style = slide && slide.style;
            if (dist > 0) {
                dist = dist + opts.space
            } else if (dist < 0) {
                dist = dist - opts.space
            }
            if (!style) {
                return false;
            }

            style.cssText += cssPrefix + 'transition-duration:' + speed +
                'ms;' + cssPrefix + 'transform: translate(' +
                dist + 'px, 0)' + translateZ + ';';
        };

        $slider.prototype.circle = function(index, arr) {
            var _sl = this,
                opts = _sl.opts,
                len;

            arr = arr || _sl._items;
            len = arr.length;

            return (index % len + len) % arr.length;
        };

        $slider.prototype.slide = function(from, diff, dir, width, speed, opts) {
            var _sl = this,
                to, opts = _sl.opts;

            to = _sl.circle(from - dir * diff);

            // 如果不是loop模式，以实际位置的方向为准
            if (!opts.loop) {
                dir = Math.abs(from - to) / (from - to);
            }

            // 调整初始位置，如果已经在位置上不会重复处理
            _sl.move(to, -dir * width, 0, true);

            _sl.move(from, width * dir, speed);
            _sl.move(to, 0, speed);

            _sl.index = to;
            _sl.ref.trigger('slide', [to, from]);
            return _sl;
        };

        /**
         * 切换到第几个slide
         */
        $slider.prototype.slideTo = function(to, speed) {
            var _sl = this,
                opts = _sl.opts;
            if (_sl.index === to || _sl.index === _sl.circle(to)) {
                return this;
            }

            var index = _sl.index,
                diff = Math.abs(index - to),

                // 1向左，-1向右
                dir = diff / (index - to),
                width = _sl.width;

            speed = speed || opts.speed;

            return _sl.slide(index, diff, dir, width, speed, opts);
        };

        /**
         * 返回当前显示的第几个slide
         * @method getIndex
         * @chainable
         * @return {Number} 当前的silde序号
         */
        $slider.prototype.getIndex = function() {
            return this.index;
        };

        /**
         * 销毁组件
         * @method destroy
         */
        $slider.prototype.destroy = function() {

        };

        //注册$插件
        $.fn.slider = function(opts) {
            var sliderObjs = [];
            opts || (opts = {});
            this.each(function() {
                var sliderObj = null;
                var id = this.getAttribute('data-slider');
                if (!id) {
                    opts = $.extend(opts, {
                        ref: this
                    });
                    id = ++$ui.uuid;
                    sliderObj = $ui.data[id] = new $slider(opts);
                    this.setAttribute('data-slider', id);
                } else {
                    sliderObj = $ui.data[id];
                }
                sliderObjs.push(sliderObj);
            });
            return sliderObjs.length > 1 ? sliderObjs : sliderObjs[0];
        };

    });

})();
/**
 * Swiper 3.3.1
 * Most modern mobile touch slider and framework with hardware accelerated transitions
 * 
 * http://www.idangero.us/swiper/
 * 
 * Copyright 2016, Vladimir Kharlampidi
 * The iDangero.us
 * http://www.idangero.us/
 * 
 * Licensed under MIT
 * 
 * Released on: February 7, 2016
 */
!function(){"use strict";function e(e){e.fn.swiper=function(a){var r;return e(this).each(function(){var e=new t(this,a);r||(r=e)}),r}}var a,t=function(e,i){function s(e){return Math.floor(e)}function n(){b.autoplayTimeoutId=setTimeout(function(){b.params.loop?(b.fixLoop(),b._slideNext(),b.emit("onAutoplay",b)):b.isEnd?i.autoplayStopOnLast?b.stopAutoplay():(b._slideTo(0),b.emit("onAutoplay",b)):(b._slideNext(),b.emit("onAutoplay",b))},b.params.autoplay)}function o(e,t){var r=a(e.target);if(!r.is(t))if("string"==typeof t)r=r.parents(t);else if(t.nodeType){var i;return r.parents().each(function(e,a){a===t&&(i=t)}),i?t:void 0}if(0!==r.length)return r[0]}function l(e,a){a=a||{};var t=window.MutationObserver||window.WebkitMutationObserver,r=new t(function(e){e.forEach(function(e){b.onResize(!0),b.emit("onObserverUpdate",b,e)})});r.observe(e,{attributes:"undefined"==typeof a.attributes?!0:a.attributes,childList:"undefined"==typeof a.childList?!0:a.childList,characterData:"undefined"==typeof a.characterData?!0:a.characterData}),b.observers.push(r)}function p(e){e.originalEvent&&(e=e.originalEvent);var a=e.keyCode||e.charCode;if(!b.params.allowSwipeToNext&&(b.isHorizontal()&&39===a||!b.isHorizontal()&&40===a))return!1;if(!b.params.allowSwipeToPrev&&(b.isHorizontal()&&37===a||!b.isHorizontal()&&38===a))return!1;if(!(e.shiftKey||e.altKey||e.ctrlKey||e.metaKey||document.activeElement&&document.activeElement.nodeName&&("input"===document.activeElement.nodeName.toLowerCase()||"textarea"===document.activeElement.nodeName.toLowerCase()))){if(37===a||39===a||38===a||40===a){var t=!1;if(b.container.parents(".swiper-slide").length>0&&0===b.container.parents(".swiper-slide-active").length)return;var r={left:window.pageXOffset,top:window.pageYOffset},i=window.innerWidth,s=window.innerHeight,n=b.container.offset();b.rtl&&(n.left=n.left-b.container[0].scrollLeft);for(var o=[[n.left,n.top],[n.left+b.width,n.top],[n.left,n.top+b.height],[n.left+b.width,n.top+b.height]],l=0;l<o.length;l++){var p=o[l];p[0]>=r.left&&p[0]<=r.left+i&&p[1]>=r.top&&p[1]<=r.top+s&&(t=!0)}if(!t)return}b.isHorizontal()?((37===a||39===a)&&(e.preventDefault?e.preventDefault():e.returnValue=!1),(39===a&&!b.rtl||37===a&&b.rtl)&&b.slideNext(),(37===a&&!b.rtl||39===a&&b.rtl)&&b.slidePrev()):((38===a||40===a)&&(e.preventDefault?e.preventDefault():e.returnValue=!1),40===a&&b.slideNext(),38===a&&b.slidePrev())}}function d(e){e.originalEvent&&(e=e.originalEvent);var a=b.mousewheel.event,t=0,r=b.rtl?-1:1;if("mousewheel"===a)if(b.params.mousewheelForceToAxis)if(b.isHorizontal()){if(!(Math.abs(e.wheelDeltaX)>Math.abs(e.wheelDeltaY)))return;t=e.wheelDeltaX*r}else{if(!(Math.abs(e.wheelDeltaY)>Math.abs(e.wheelDeltaX)))return;t=e.wheelDeltaY}else t=Math.abs(e.wheelDeltaX)>Math.abs(e.wheelDeltaY)?-e.wheelDeltaX*r:-e.wheelDeltaY;else if("DOMMouseScroll"===a)t=-e.detail;else if("wheel"===a)if(b.params.mousewheelForceToAxis)if(b.isHorizontal()){if(!(Math.abs(e.deltaX)>Math.abs(e.deltaY)))return;t=-e.deltaX*r}else{if(!(Math.abs(e.deltaY)>Math.abs(e.deltaX)))return;t=-e.deltaY}else t=Math.abs(e.deltaX)>Math.abs(e.deltaY)?-e.deltaX*r:-e.deltaY;if(0!==t){if(b.params.mousewheelInvert&&(t=-t),b.params.freeMode){var i=b.getWrapperTranslate()+t*b.params.mousewheelSensitivity,s=b.isBeginning,n=b.isEnd;if(i>=b.minTranslate()&&(i=b.minTranslate()),i<=b.maxTranslate()&&(i=b.maxTranslate()),b.setWrapperTransition(0),b.setWrapperTranslate(i),b.updateProgress(),b.updateActiveIndex(),(!s&&b.isBeginning||!n&&b.isEnd)&&b.updateClasses(),b.params.freeModeSticky?(clearTimeout(b.mousewheel.timeout),b.mousewheel.timeout=setTimeout(function(){b.slideReset()},300)):b.params.lazyLoading&&b.lazy&&b.lazy.load(),0===i||i===b.maxTranslate())return}else{if((new window.Date).getTime()-b.mousewheel.lastScrollTime>60)if(0>t)if(b.isEnd&&!b.params.loop||b.animating){if(b.params.mousewheelReleaseOnEdges)return!0}else b.slideNext();else if(b.isBeginning&&!b.params.loop||b.animating){if(b.params.mousewheelReleaseOnEdges)return!0}else b.slidePrev();b.mousewheel.lastScrollTime=(new window.Date).getTime()}return b.params.autoplay&&b.stopAutoplay(),e.preventDefault?e.preventDefault():e.returnValue=!1,!1}}function u(e,t){e=a(e);var r,i,s,n=b.rtl?-1:1;r=e.attr("data-swiper-parallax")||"0",i=e.attr("data-swiper-parallax-x"),s=e.attr("data-swiper-parallax-y"),i||s?(i=i||"0",s=s||"0"):b.isHorizontal()?(i=r,s="0"):(s=r,i="0"),i=i.indexOf("%")>=0?parseInt(i,10)*t*n+"%":i*t*n+"px",s=s.indexOf("%")>=0?parseInt(s,10)*t+"%":s*t+"px",e.transform("translate3d("+i+", "+s+",0px)")}function c(e){return 0!==e.indexOf("on")&&(e=e[0]!==e[0].toUpperCase()?"on"+e[0].toUpperCase()+e.substring(1):"on"+e),e}if(!(this instanceof t))return new t(e,i);var m={direction:"horizontal",touchEventsTarget:"container",initialSlide:0,speed:300,autoplay:!1,autoplayDisableOnInteraction:!0,autoplayStopOnLast:!1,iOSEdgeSwipeDetection:!1,iOSEdgeSwipeThreshold:20,freeMode:!1,freeModeMomentum:!0,freeModeMomentumRatio:1,freeModeMomentumBounce:!0,freeModeMomentumBounceRatio:1,freeModeSticky:!1,freeModeMinimumVelocity:.02,autoHeight:!1,setWrapperSize:!1,virtualTranslate:!1,effect:"slide",coverflow:{rotate:50,stretch:0,depth:100,modifier:1,slideShadows:!0},flip:{slideShadows:!0,limitRotation:!0},cube:{slideShadows:!0,shadow:!0,shadowOffset:20,shadowScale:.94},fade:{crossFade:!1},parallax:!1,scrollbar:null,scrollbarHide:!0,scrollbarDraggable:!1,scrollbarSnapOnRelease:!1,keyboardControl:!1,mousewheelControl:!1,mousewheelReleaseOnEdges:!1,mousewheelInvert:!1,mousewheelForceToAxis:!1,mousewheelSensitivity:1,hashnav:!1,breakpoints:void 0,spaceBetween:0,slidesPerView:1,slidesPerColumn:1,slidesPerColumnFill:"column",slidesPerGroup:1,centeredSlides:!1,slidesOffsetBefore:0,slidesOffsetAfter:0,roundLengths:!1,touchRatio:1,touchAngle:45,simulateTouch:!0,shortSwipes:!0,longSwipes:!0,longSwipesRatio:.5,longSwipesMs:300,followFinger:!0,onlyExternal:!1,threshold:0,touchMoveStopPropagation:!0,uniqueNavElements:!0,pagination:null,paginationElement:"span",paginationClickable:!1,paginationHide:!1,paginationBulletRender:null,paginationProgressRender:null,paginationFractionRender:null,paginationCustomRender:null,paginationType:"bullets",resistance:!0,resistanceRatio:.85,nextButton:null,prevButton:null,watchSlidesProgress:!1,watchSlidesVisibility:!1,grabCursor:!1,preventClicks:!0,preventClicksPropagation:!0,slideToClickedSlide:!1,lazyLoading:!1,lazyLoadingInPrevNext:!1,lazyLoadingInPrevNextAmount:1,lazyLoadingOnTransitionStart:!1,preloadImages:!0,updateOnImagesReady:!0,loop:!1,loopAdditionalSlides:0,loopedSlides:null,control:void 0,controlInverse:!1,controlBy:"slide",allowSwipeToPrev:!0,allowSwipeToNext:!0,swipeHandler:null,noSwiping:!0,noSwipingClass:"swiper-no-swiping",slideClass:"swiper-slide",slideActiveClass:"swiper-slide-active",slideVisibleClass:"swiper-slide-visible",slideDuplicateClass:"swiper-slide-duplicate",slideNextClass:"swiper-slide-next",slidePrevClass:"swiper-slide-prev",wrapperClass:"swiper-wrapper",bulletClass:"swiper-pagination-bullet",bulletActiveClass:"swiper-pagination-bullet-active",buttonDisabledClass:"swiper-button-disabled",paginationCurrentClass:"swiper-pagination-current",paginationTotalClass:"swiper-pagination-total",paginationHiddenClass:"swiper-pagination-hidden",paginationProgressbarClass:"swiper-pagination-progressbar",observer:!1,observeParents:!1,a11y:!1,prevSlideMessage:"Previous slide",nextSlideMessage:"Next slide",firstSlideMessage:"This is the first slide",lastSlideMessage:"This is the last slide",paginationBulletMessage:"Go to slide {{index}}",runCallbacksOnInit:!0},h=i&&i.virtualTranslate;i=i||{};var f={};for(var g in i)if("object"!=typeof i[g]||null===i[g]||(i[g].nodeType||i[g]===window||i[g]===document||"undefined"!=typeof r&&i[g]instanceof r||"undefined"!=typeof jQuery&&i[g]instanceof jQuery))f[g]=i[g];else{f[g]={};for(var v in i[g])f[g][v]=i[g][v]}for(var w in m)if("undefined"==typeof i[w])i[w]=m[w];else if("object"==typeof i[w])for(var y in m[w])"undefined"==typeof i[w][y]&&(i[w][y]=m[w][y]);var b=this;if(b.params=i,b.originalParams=f,b.classNames=[],"undefined"!=typeof a&&"undefined"!=typeof r&&(a=r),("undefined"!=typeof a||(a="undefined"==typeof r?window.Dom7||window.Zepto||window.jQuery:r))&&(b.$=a,b.currentBreakpoint=void 0,b.getActiveBreakpoint=function(){if(!b.params.breakpoints)return!1;var e,a=!1,t=[];for(e in b.params.breakpoints)b.params.breakpoints.hasOwnProperty(e)&&t.push(e);t.sort(function(e,a){return parseInt(e,10)>parseInt(a,10)});for(var r=0;r<t.length;r++)e=t[r],e>=window.innerWidth&&!a&&(a=e);return a||"max"},b.setBreakpoint=function(){var e=b.getActiveBreakpoint();if(e&&b.currentBreakpoint!==e){var a=e in b.params.breakpoints?b.params.breakpoints[e]:b.originalParams,t=b.params.loop&&a.slidesPerView!==b.params.slidesPerView;for(var r in a)b.params[r]=a[r];b.currentBreakpoint=e,t&&b.destroyLoop&&b.reLoop(!0)}},b.params.breakpoints&&b.setBreakpoint(),b.container=a(e),0!==b.container.length)){if(b.container.length>1){var x=[];return b.container.each(function(){x.push(new t(this,i))}),x}b.container[0].swiper=b,b.container.data("swiper",b),b.classNames.push("swiper-container-"+b.params.direction),b.params.freeMode&&b.classNames.push("swiper-container-free-mode"),b.support.flexbox||(b.classNames.push("swiper-container-no-flexbox"),b.params.slidesPerColumn=1),b.params.autoHeight&&b.classNames.push("swiper-container-autoheight"),(b.params.parallax||b.params.watchSlidesVisibility)&&(b.params.watchSlidesProgress=!0),["cube","coverflow","flip"].indexOf(b.params.effect)>=0&&(b.support.transforms3d?(b.params.watchSlidesProgress=!0,b.classNames.push("swiper-container-3d")):b.params.effect="slide"),"slide"!==b.params.effect&&b.classNames.push("swiper-container-"+b.params.effect),"cube"===b.params.effect&&(b.params.resistanceRatio=0,b.params.slidesPerView=1,b.params.slidesPerColumn=1,b.params.slidesPerGroup=1,b.params.centeredSlides=!1,b.params.spaceBetween=0,b.params.virtualTranslate=!0,b.params.setWrapperSize=!1),("fade"===b.params.effect||"flip"===b.params.effect)&&(b.params.slidesPerView=1,b.params.slidesPerColumn=1,b.params.slidesPerGroup=1,b.params.watchSlidesProgress=!0,b.params.spaceBetween=0,b.params.setWrapperSize=!1,"undefined"==typeof h&&(b.params.virtualTranslate=!0)),b.params.grabCursor&&b.support.touch&&(b.params.grabCursor=!1),b.wrapper=b.container.children("."+b.params.wrapperClass),b.params.pagination&&(b.paginationContainer=a(b.params.pagination),b.params.uniqueNavElements&&"string"==typeof b.params.pagination&&b.paginationContainer.length>1&&1===b.container.find(b.params.pagination).length&&(b.paginationContainer=b.container.find(b.params.pagination)),"bullets"===b.params.paginationType&&b.params.paginationClickable?b.paginationContainer.addClass("swiper-pagination-clickable"):b.params.paginationClickable=!1,b.paginationContainer.addClass("swiper-pagination-"+b.params.paginationType)),(b.params.nextButton||b.params.prevButton)&&(b.params.nextButton&&(b.nextButton=a(b.params.nextButton),b.params.uniqueNavElements&&"string"==typeof b.params.nextButton&&b.nextButton.length>1&&1===b.container.find(b.params.nextButton).length&&(b.nextButton=b.container.find(b.params.nextButton))),b.params.prevButton&&(b.prevButton=a(b.params.prevButton),b.params.uniqueNavElements&&"string"==typeof b.params.prevButton&&b.prevButton.length>1&&1===b.container.find(b.params.prevButton).length&&(b.prevButton=b.container.find(b.params.prevButton)))),b.isHorizontal=function(){return"horizontal"===b.params.direction},b.rtl=b.isHorizontal()&&("rtl"===b.container[0].dir.toLowerCase()||"rtl"===b.container.css("direction")),b.rtl&&b.classNames.push("swiper-container-rtl"),b.rtl&&(b.wrongRTL="-webkit-box"===b.wrapper.css("display")),b.params.slidesPerColumn>1&&b.classNames.push("swiper-container-multirow"),b.device.android&&b.classNames.push("swiper-container-android"),b.container.addClass(b.classNames.join(" ")),b.translate=0,b.progress=0,b.velocity=0,b.lockSwipeToNext=function(){b.params.allowSwipeToNext=!1},b.lockSwipeToPrev=function(){b.params.allowSwipeToPrev=!1},b.lockSwipes=function(){b.params.allowSwipeToNext=b.params.allowSwipeToPrev=!1},b.unlockSwipeToNext=function(){b.params.allowSwipeToNext=!0},b.unlockSwipeToPrev=function(){b.params.allowSwipeToPrev=!0},b.unlockSwipes=function(){b.params.allowSwipeToNext=b.params.allowSwipeToPrev=!0},b.params.grabCursor&&(b.container[0].style.cursor="move",b.container[0].style.cursor="-webkit-grab",b.container[0].style.cursor="-moz-grab",b.container[0].style.cursor="grab"),b.imagesToLoad=[],b.imagesLoaded=0,b.loadImage=function(e,a,t,r,i){function s(){i&&i()}var n;e.complete&&r?s():a?(n=new window.Image,n.onload=s,n.onerror=s,t&&(n.srcset=t),a&&(n.src=a)):s()},b.preloadImages=function(){function e(){"undefined"!=typeof b&&null!==b&&(void 0!==b.imagesLoaded&&b.imagesLoaded++,b.imagesLoaded===b.imagesToLoad.length&&(b.params.updateOnImagesReady&&b.update(),b.emit("onImagesReady",b)))}b.imagesToLoad=b.container.find("img");for(var a=0;a<b.imagesToLoad.length;a++)b.loadImage(b.imagesToLoad[a],b.imagesToLoad[a].currentSrc||b.imagesToLoad[a].getAttribute("src"),b.imagesToLoad[a].srcset||b.imagesToLoad[a].getAttribute("srcset"),!0,e)},b.autoplayTimeoutId=void 0,b.autoplaying=!1,b.autoplayPaused=!1,b.startAutoplay=function(){return"undefined"!=typeof b.autoplayTimeoutId?!1:b.params.autoplay?b.autoplaying?!1:(b.autoplaying=!0,b.emit("onAutoplayStart",b),void n()):!1},b.stopAutoplay=function(e){b.autoplayTimeoutId&&(b.autoplayTimeoutId&&clearTimeout(b.autoplayTimeoutId),b.autoplaying=!1,b.autoplayTimeoutId=void 0,b.emit("onAutoplayStop",b))},b.pauseAutoplay=function(e){b.autoplayPaused||(b.autoplayTimeoutId&&clearTimeout(b.autoplayTimeoutId),b.autoplayPaused=!0,0===e?(b.autoplayPaused=!1,n()):b.wrapper.transitionEnd(function(){b&&(b.autoplayPaused=!1,b.autoplaying?n():b.stopAutoplay())}))},b.minTranslate=function(){return-b.snapGrid[0]},b.maxTranslate=function(){return-b.snapGrid[b.snapGrid.length-1]},b.updateAutoHeight=function(){var e=b.slides.eq(b.activeIndex)[0];if("undefined"!=typeof e){var a=e.offsetHeight;a&&b.wrapper.css("height",a+"px")}},b.updateContainerSize=function(){var e,a;e="undefined"!=typeof b.params.width?b.params.width:b.container[0].clientWidth,a="undefined"!=typeof b.params.height?b.params.height:b.container[0].clientHeight,0===e&&b.isHorizontal()||0===a&&!b.isHorizontal()||(e=e-parseInt(b.container.css("padding-left"),10)-parseInt(b.container.css("padding-right"),10),a=a-parseInt(b.container.css("padding-top"),10)-parseInt(b.container.css("padding-bottom"),10),b.width=e,b.height=a,b.size=b.isHorizontal()?b.width:b.height)},b.updateSlidesSize=function(){b.slides=b.wrapper.children("."+b.params.slideClass),b.snapGrid=[],b.slidesGrid=[],b.slidesSizesGrid=[];var e,a=b.params.spaceBetween,t=-b.params.slidesOffsetBefore,r=0,i=0;if("undefined"!=typeof b.size){"string"==typeof a&&a.indexOf("%")>=0&&(a=parseFloat(a.replace("%",""))/100*b.size),b.virtualSize=-a,b.rtl?b.slides.css({marginLeft:"",marginTop:""}):b.slides.css({marginRight:"",marginBottom:""});var n;b.params.slidesPerColumn>1&&(n=Math.floor(b.slides.length/b.params.slidesPerColumn)===b.slides.length/b.params.slidesPerColumn?b.slides.length:Math.ceil(b.slides.length/b.params.slidesPerColumn)*b.params.slidesPerColumn,"auto"!==b.params.slidesPerView&&"row"===b.params.slidesPerColumnFill&&(n=Math.max(n,b.params.slidesPerView*b.params.slidesPerColumn)));var o,l=b.params.slidesPerColumn,p=n/l,d=p-(b.params.slidesPerColumn*p-b.slides.length);for(e=0;e<b.slides.length;e++){o=0;var u=b.slides.eq(e);if(b.params.slidesPerColumn>1){var c,m,h;"column"===b.params.slidesPerColumnFill?(m=Math.floor(e/l),h=e-m*l,(m>d||m===d&&h===l-1)&&++h>=l&&(h=0,m++),c=m+h*n/l,u.css({"-webkit-box-ordinal-group":c,"-moz-box-ordinal-group":c,"-ms-flex-order":c,"-webkit-order":c,order:c})):(h=Math.floor(e/p),m=e-h*p),u.css({"margin-top":0!==h&&b.params.spaceBetween&&b.params.spaceBetween+"px"}).attr("data-swiper-column",m).attr("data-swiper-row",h)}"none"!==u.css("display")&&("auto"===b.params.slidesPerView?(o=b.isHorizontal()?u.outerWidth(!0):u.outerHeight(!0),b.params.roundLengths&&(o=s(o))):(o=(b.size-(b.params.slidesPerView-1)*a)/b.params.slidesPerView,b.params.roundLengths&&(o=s(o)),b.isHorizontal()?b.slides[e].style.width=o+"px":b.slides[e].style.height=o+"px"),b.slides[e].swiperSlideSize=o,b.slidesSizesGrid.push(o),b.params.centeredSlides?(t=t+o/2+r/2+a,0===e&&(t=t-b.size/2-a),Math.abs(t)<.001&&(t=0),i%b.params.slidesPerGroup===0&&b.snapGrid.push(t),b.slidesGrid.push(t)):(i%b.params.slidesPerGroup===0&&b.snapGrid.push(t),b.slidesGrid.push(t),t=t+o+a),b.virtualSize+=o+a,r=o,i++)}b.virtualSize=Math.max(b.virtualSize,b.size)+b.params.slidesOffsetAfter;var f;if(b.rtl&&b.wrongRTL&&("slide"===b.params.effect||"coverflow"===b.params.effect)&&b.wrapper.css({width:b.virtualSize+b.params.spaceBetween+"px"}),(!b.support.flexbox||b.params.setWrapperSize)&&(b.isHorizontal()?b.wrapper.css({width:b.virtualSize+b.params.spaceBetween+"px"}):b.wrapper.css({height:b.virtualSize+b.params.spaceBetween+"px"})),b.params.slidesPerColumn>1&&(b.virtualSize=(o+b.params.spaceBetween)*n,b.virtualSize=Math.ceil(b.virtualSize/b.params.slidesPerColumn)-b.params.spaceBetween,b.wrapper.css({width:b.virtualSize+b.params.spaceBetween+"px"}),b.params.centeredSlides)){for(f=[],e=0;e<b.snapGrid.length;e++)b.snapGrid[e]<b.virtualSize+b.snapGrid[0]&&f.push(b.snapGrid[e]);b.snapGrid=f}if(!b.params.centeredSlides){for(f=[],e=0;e<b.snapGrid.length;e++)b.snapGrid[e]<=b.virtualSize-b.size&&f.push(b.snapGrid[e]);b.snapGrid=f,Math.floor(b.virtualSize-b.size)-Math.floor(b.snapGrid[b.snapGrid.length-1])>1&&b.snapGrid.push(b.virtualSize-b.size)}0===b.snapGrid.length&&(b.snapGrid=[0]),0!==b.params.spaceBetween&&(b.isHorizontal()?b.rtl?b.slides.css({marginLeft:a+"px"}):b.slides.css({marginRight:a+"px"}):b.slides.css({marginBottom:a+"px"})),b.params.watchSlidesProgress&&b.updateSlidesOffset()}},b.updateSlidesOffset=function(){for(var e=0;e<b.slides.length;e++)b.slides[e].swiperSlideOffset=b.isHorizontal()?b.slides[e].offsetLeft:b.slides[e].offsetTop},b.updateSlidesProgress=function(e){if("undefined"==typeof e&&(e=b.translate||0),0!==b.slides.length){"undefined"==typeof b.slides[0].swiperSlideOffset&&b.updateSlidesOffset();var a=-e;b.rtl&&(a=e),b.slides.removeClass(b.params.slideVisibleClass);for(var t=0;t<b.slides.length;t++){var r=b.slides[t],i=(a-r.swiperSlideOffset)/(r.swiperSlideSize+b.params.spaceBetween);if(b.params.watchSlidesVisibility){var s=-(a-r.swiperSlideOffset),n=s+b.slidesSizesGrid[t],o=s>=0&&s<b.size||n>0&&n<=b.size||0>=s&&n>=b.size;o&&b.slides.eq(t).addClass(b.params.slideVisibleClass)}r.progress=b.rtl?-i:i}}},b.updateProgress=function(e){"undefined"==typeof e&&(e=b.translate||0);var a=b.maxTranslate()-b.minTranslate(),t=b.isBeginning,r=b.isEnd;0===a?(b.progress=0,b.isBeginning=b.isEnd=!0):(b.progress=(e-b.minTranslate())/a,b.isBeginning=b.progress<=0,b.isEnd=b.progress>=1),b.isBeginning&&!t&&b.emit("onReachBeginning",b),b.isEnd&&!r&&b.emit("onReachEnd",b),b.params.watchSlidesProgress&&b.updateSlidesProgress(e),b.emit("onProgress",b,b.progress)},b.updateActiveIndex=function(){var e,a,t,r=b.rtl?b.translate:-b.translate;for(a=0;a<b.slidesGrid.length;a++)"undefined"!=typeof b.slidesGrid[a+1]?r>=b.slidesGrid[a]&&r<b.slidesGrid[a+1]-(b.slidesGrid[a+1]-b.slidesGrid[a])/2?e=a:r>=b.slidesGrid[a]&&r<b.slidesGrid[a+1]&&(e=a+1):r>=b.slidesGrid[a]&&(e=a);(0>e||"undefined"==typeof e)&&(e=0),t=Math.floor(e/b.params.slidesPerGroup),t>=b.snapGrid.length&&(t=b.snapGrid.length-1),e!==b.activeIndex&&(b.snapIndex=t,b.previousIndex=b.activeIndex,b.activeIndex=e,b.updateClasses())},b.updateClasses=function(){b.slides.removeClass(b.params.slideActiveClass+" "+b.params.slideNextClass+" "+b.params.slidePrevClass);var e=b.slides.eq(b.activeIndex);e.addClass(b.params.slideActiveClass);var t=e.next("."+b.params.slideClass).addClass(b.params.slideNextClass);b.params.loop&&0===t.length&&b.slides.eq(0).addClass(b.params.slideNextClass);var r=e.prev("."+b.params.slideClass).addClass(b.params.slidePrevClass);if(b.params.loop&&0===r.length&&b.slides.eq(-1).addClass(b.params.slidePrevClass),b.paginationContainer&&b.paginationContainer.length>0){var i,s=b.params.loop?Math.ceil((b.slides.length-2*b.loopedSlides)/b.params.slidesPerGroup):b.snapGrid.length;if(b.params.loop?(i=Math.ceil((b.activeIndex-b.loopedSlides)/b.params.slidesPerGroup),i>b.slides.length-1-2*b.loopedSlides&&(i-=b.slides.length-2*b.loopedSlides),i>s-1&&(i-=s),0>i&&"bullets"!==b.params.paginationType&&(i=s+i)):i="undefined"!=typeof b.snapIndex?b.snapIndex:b.activeIndex||0,"bullets"===b.params.paginationType&&b.bullets&&b.bullets.length>0&&(b.bullets.removeClass(b.params.bulletActiveClass),b.paginationContainer.length>1?b.bullets.each(function(){a(this).index()===i&&a(this).addClass(b.params.bulletActiveClass)}):b.bullets.eq(i).addClass(b.params.bulletActiveClass)),"fraction"===b.params.paginationType&&(b.paginationContainer.find("."+b.params.paginationCurrentClass).text(i+1),b.paginationContainer.find("."+b.params.paginationTotalClass).text(s)),"progress"===b.params.paginationType){var n=(i+1)/s,o=n,l=1;b.isHorizontal()||(l=n,o=1),b.paginationContainer.find("."+b.params.paginationProgressbarClass).transform("translate3d(0,0,0) scaleX("+o+") scaleY("+l+")").transition(b.params.speed)}"custom"===b.params.paginationType&&b.params.paginationCustomRender&&(b.paginationContainer.html(b.params.paginationCustomRender(b,i+1,s)),b.emit("onPaginationRendered",b,b.paginationContainer[0]))}b.params.loop||(b.params.prevButton&&b.prevButton&&b.prevButton.length>0&&(b.isBeginning?(b.prevButton.addClass(b.params.buttonDisabledClass),b.params.a11y&&b.a11y&&b.a11y.disable(b.prevButton)):(b.prevButton.removeClass(b.params.buttonDisabledClass),b.params.a11y&&b.a11y&&b.a11y.enable(b.prevButton))),b.params.nextButton&&b.nextButton&&b.nextButton.length>0&&(b.isEnd?(b.nextButton.addClass(b.params.buttonDisabledClass),b.params.a11y&&b.a11y&&b.a11y.disable(b.nextButton)):(b.nextButton.removeClass(b.params.buttonDisabledClass),b.params.a11y&&b.a11y&&b.a11y.enable(b.nextButton))))},b.updatePagination=function(){if(b.params.pagination&&b.paginationContainer&&b.paginationContainer.length>0){var e="";if("bullets"===b.params.paginationType){for(var a=b.params.loop?Math.ceil((b.slides.length-2*b.loopedSlides)/b.params.slidesPerGroup):b.snapGrid.length,t=0;a>t;t++)e+=b.params.paginationBulletRender?b.params.paginationBulletRender(t,b.params.bulletClass):"<"+b.params.paginationElement+' class="'+b.params.bulletClass+'"></'+b.params.paginationElement+">";b.paginationContainer.html(e),b.bullets=b.paginationContainer.find("."+b.params.bulletClass),b.params.paginationClickable&&b.params.a11y&&b.a11y&&b.a11y.initPagination()}"fraction"===b.params.paginationType&&(e=b.params.paginationFractionRender?b.params.paginationFractionRender(b,b.params.paginationCurrentClass,b.params.paginationTotalClass):'<span class="'+b.params.paginationCurrentClass+'"></span> / <span class="'+b.params.paginationTotalClass+'"></span>',b.paginationContainer.html(e)),"progress"===b.params.paginationType&&(e=b.params.paginationProgressRender?b.params.paginationProgressRender(b,b.params.paginationProgressbarClass):'<span class="'+b.params.paginationProgressbarClass+'"></span>',b.paginationContainer.html(e)),"custom"!==b.params.paginationType&&b.emit("onPaginationRendered",b,b.paginationContainer[0])}},b.update=function(e){function a(){r=Math.min(Math.max(b.translate,b.maxTranslate()),b.minTranslate()),b.setWrapperTranslate(r),b.updateActiveIndex(),b.updateClasses()}if(b.updateContainerSize(),b.updateSlidesSize(),b.updateProgress(),b.updatePagination(),b.updateClasses(),b.params.scrollbar&&b.scrollbar&&b.scrollbar.set(),e){var t,r;b.controller&&b.controller.spline&&(b.controller.spline=void 0),b.params.freeMode?(a(),b.params.autoHeight&&b.updateAutoHeight()):(t=("auto"===b.params.slidesPerView||b.params.slidesPerView>1)&&b.isEnd&&!b.params.centeredSlides?b.slideTo(b.slides.length-1,0,!1,!0):b.slideTo(b.activeIndex,0,!1,!0),t||a())}else b.params.autoHeight&&b.updateAutoHeight()},b.onResize=function(e){b.params.breakpoints&&b.setBreakpoint();var a=b.params.allowSwipeToPrev,t=b.params.allowSwipeToNext;b.params.allowSwipeToPrev=b.params.allowSwipeToNext=!0,b.updateContainerSize(),b.updateSlidesSize(),("auto"===b.params.slidesPerView||b.params.freeMode||e)&&b.updatePagination(),b.params.scrollbar&&b.scrollbar&&b.scrollbar.set(),b.controller&&b.controller.spline&&(b.controller.spline=void 0);var r=!1;if(b.params.freeMode){var i=Math.min(Math.max(b.translate,b.maxTranslate()),b.minTranslate());b.setWrapperTranslate(i),b.updateActiveIndex(),b.updateClasses(),b.params.autoHeight&&b.updateAutoHeight()}else b.updateClasses(),r=("auto"===b.params.slidesPerView||b.params.slidesPerView>1)&&b.isEnd&&!b.params.centeredSlides?b.slideTo(b.slides.length-1,0,!1,!0):b.slideTo(b.activeIndex,0,!1,!0);b.params.lazyLoading&&!r&&b.lazy&&b.lazy.load(),b.params.allowSwipeToPrev=a,b.params.allowSwipeToNext=t};var T=["mousedown","mousemove","mouseup"];window.navigator.pointerEnabled?T=["pointerdown","pointermove","pointerup"]:window.navigator.msPointerEnabled&&(T=["MSPointerDown","MSPointerMove","MSPointerUp"]),b.touchEvents={start:b.support.touch||!b.params.simulateTouch?"touchstart":T[0],move:b.support.touch||!b.params.simulateTouch?"touchmove":T[1],end:b.support.touch||!b.params.simulateTouch?"touchend":T[2]},(window.navigator.pointerEnabled||window.navigator.msPointerEnabled)&&("container"===b.params.touchEventsTarget?b.container:b.wrapper).addClass("swiper-wp8-"+b.params.direction),b.initEvents=function(e){var a=e?"off":"on",t=e?"removeEventListener":"addEventListener",r="container"===b.params.touchEventsTarget?b.container[0]:b.wrapper[0],s=b.support.touch?r:document,n=b.params.nested?!0:!1;b.browser.ie?(r[t](b.touchEvents.start,b.onTouchStart,!1),s[t](b.touchEvents.move,b.onTouchMove,n),s[t](b.touchEvents.end,b.onTouchEnd,!1)):(b.support.touch&&(r[t](b.touchEvents.start,b.onTouchStart,!1),r[t](b.touchEvents.move,b.onTouchMove,n),r[t](b.touchEvents.end,b.onTouchEnd,!1)),!i.simulateTouch||b.device.ios||b.device.android||(r[t]("mousedown",b.onTouchStart,!1),document[t]("mousemove",b.onTouchMove,n),document[t]("mouseup",b.onTouchEnd,!1))),window[t]("resize",b.onResize),b.params.nextButton&&b.nextButton&&b.nextButton.length>0&&(b.nextButton[a]("click",b.onClickNext),b.params.a11y&&b.a11y&&b.nextButton[a]("keydown",b.a11y.onEnterKey)),b.params.prevButton&&b.prevButton&&b.prevButton.length>0&&(b.prevButton[a]("click",b.onClickPrev),b.params.a11y&&b.a11y&&b.prevButton[a]("keydown",b.a11y.onEnterKey)),b.params.pagination&&b.params.paginationClickable&&(b.paginationContainer[a]("click","."+b.params.bulletClass,b.onClickIndex),b.params.a11y&&b.a11y&&b.paginationContainer[a]("keydown","."+b.params.bulletClass,b.a11y.onEnterKey)),(b.params.preventClicks||b.params.preventClicksPropagation)&&r[t]("click",b.preventClicks,!0)},b.attachEvents=function(){b.initEvents()},b.detachEvents=function(){b.initEvents(!0)},b.allowClick=!0,b.preventClicks=function(e){b.allowClick||(b.params.preventClicks&&e.preventDefault(),b.params.preventClicksPropagation&&b.animating&&(e.stopPropagation(),e.stopImmediatePropagation()))},b.onClickNext=function(e){e.preventDefault(),(!b.isEnd||b.params.loop)&&b.slideNext()},b.onClickPrev=function(e){e.preventDefault(),(!b.isBeginning||b.params.loop)&&b.slidePrev()},b.onClickIndex=function(e){e.preventDefault();var t=a(this).index()*b.params.slidesPerGroup;b.params.loop&&(t+=b.loopedSlides),b.slideTo(t)},b.updateClickedSlide=function(e){var t=o(e,"."+b.params.slideClass),r=!1;if(t)for(var i=0;i<b.slides.length;i++)b.slides[i]===t&&(r=!0);if(!t||!r)return b.clickedSlide=void 0,void(b.clickedIndex=void 0);if(b.clickedSlide=t,b.clickedIndex=a(t).index(),b.params.slideToClickedSlide&&void 0!==b.clickedIndex&&b.clickedIndex!==b.activeIndex){var s,n=b.clickedIndex;if(b.params.loop){if(b.animating)return;s=a(b.clickedSlide).attr("data-swiper-slide-index"),b.params.centeredSlides?n<b.loopedSlides-b.params.slidesPerView/2||n>b.slides.length-b.loopedSlides+b.params.slidesPerView/2?(b.fixLoop(),n=b.wrapper.children("."+b.params.slideClass+'[data-swiper-slide-index="'+s+'"]:not(.swiper-slide-duplicate)').eq(0).index(),setTimeout(function(){b.slideTo(n)},0)):b.slideTo(n):n>b.slides.length-b.params.slidesPerView?(b.fixLoop(),n=b.wrapper.children("."+b.params.slideClass+'[data-swiper-slide-index="'+s+'"]:not(.swiper-slide-duplicate)').eq(0).index(),setTimeout(function(){b.slideTo(n)},0)):b.slideTo(n)}else b.slideTo(n)}};var S,C,z,M,E,P,k,I,L,B,D="input, select, textarea, button",H=Date.now(),A=[];b.animating=!1,b.touches={startX:0,startY:0,currentX:0,currentY:0,diff:0};var G,O;if(b.onTouchStart=function(e){if(e.originalEvent&&(e=e.originalEvent),G="touchstart"===e.type,G||!("which"in e)||3!==e.which){if(b.params.noSwiping&&o(e,"."+b.params.noSwipingClass))return void(b.allowClick=!0);if(!b.params.swipeHandler||o(e,b.params.swipeHandler)){var t=b.touches.currentX="touchstart"===e.type?e.targetTouches[0].pageX:e.pageX,r=b.touches.currentY="touchstart"===e.type?e.targetTouches[0].pageY:e.pageY;if(!(b.device.ios&&b.params.iOSEdgeSwipeDetection&&t<=b.params.iOSEdgeSwipeThreshold)){if(S=!0,C=!1,z=!0,E=void 0,O=void 0,b.touches.startX=t,b.touches.startY=r,M=Date.now(),b.allowClick=!0,b.updateContainerSize(),b.swipeDirection=void 0,b.params.threshold>0&&(I=!1),"touchstart"!==e.type){var i=!0;a(e.target).is(D)&&(i=!1),document.activeElement&&a(document.activeElement).is(D)&&document.activeElement.blur(),i&&e.preventDefault()}b.emit("onTouchStart",b,e)}}}},b.onTouchMove=function(e){if(e.originalEvent&&(e=e.originalEvent),!G||"mousemove"!==e.type){if(e.preventedByNestedSwiper)return b.touches.startX="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,void(b.touches.startY="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY);if(b.params.onlyExternal)return b.allowClick=!1,void(S&&(b.touches.startX=b.touches.currentX="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,b.touches.startY=b.touches.currentY="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,M=Date.now()));if(G&&document.activeElement&&e.target===document.activeElement&&a(e.target).is(D))return C=!0,void(b.allowClick=!1);if(z&&b.emit("onTouchMove",b,e),!(e.targetTouches&&e.targetTouches.length>1)){if(b.touches.currentX="touchmove"===e.type?e.targetTouches[0].pageX:e.pageX,b.touches.currentY="touchmove"===e.type?e.targetTouches[0].pageY:e.pageY,"undefined"==typeof E){var t=180*Math.atan2(Math.abs(b.touches.currentY-b.touches.startY),Math.abs(b.touches.currentX-b.touches.startX))/Math.PI;E=b.isHorizontal()?t>b.params.touchAngle:90-t>b.params.touchAngle}if(E&&b.emit("onTouchMoveOpposite",b,e),"undefined"==typeof O&&b.browser.ieTouch&&(b.touches.currentX!==b.touches.startX||b.touches.currentY!==b.touches.startY)&&(O=!0),S){if(E)return void(S=!1);if(O||!b.browser.ieTouch){b.allowClick=!1,b.emit("onSliderMove",b,e),e.preventDefault(),b.params.touchMoveStopPropagation&&!b.params.nested&&e.stopPropagation(),C||(i.loop&&b.fixLoop(),k=b.getWrapperTranslate(),b.setWrapperTransition(0),b.animating&&b.wrapper.trigger("webkitTransitionEnd transitionend oTransitionEnd MSTransitionEnd msTransitionEnd"),b.params.autoplay&&b.autoplaying&&(b.params.autoplayDisableOnInteraction?b.stopAutoplay():b.pauseAutoplay()),B=!1,b.params.grabCursor&&(b.container[0].style.cursor="move",b.container[0].style.cursor="-webkit-grabbing",b.container[0].style.cursor="-moz-grabbin",b.container[0].style.cursor="grabbing")),C=!0;var r=b.touches.diff=b.isHorizontal()?b.touches.currentX-b.touches.startX:b.touches.currentY-b.touches.startY;r*=b.params.touchRatio,b.rtl&&(r=-r),b.swipeDirection=r>0?"prev":"next",P=r+k;var s=!0;if(r>0&&P>b.minTranslate()?(s=!1,b.params.resistance&&(P=b.minTranslate()-1+Math.pow(-b.minTranslate()+k+r,b.params.resistanceRatio))):0>r&&P<b.maxTranslate()&&(s=!1,b.params.resistance&&(P=b.maxTranslate()+1-Math.pow(b.maxTranslate()-k-r,b.params.resistanceRatio))),
s&&(e.preventedByNestedSwiper=!0),!b.params.allowSwipeToNext&&"next"===b.swipeDirection&&k>P&&(P=k),!b.params.allowSwipeToPrev&&"prev"===b.swipeDirection&&P>k&&(P=k),b.params.followFinger){if(b.params.threshold>0){if(!(Math.abs(r)>b.params.threshold||I))return void(P=k);if(!I)return I=!0,b.touches.startX=b.touches.currentX,b.touches.startY=b.touches.currentY,P=k,void(b.touches.diff=b.isHorizontal()?b.touches.currentX-b.touches.startX:b.touches.currentY-b.touches.startY)}(b.params.freeMode||b.params.watchSlidesProgress)&&b.updateActiveIndex(),b.params.freeMode&&(0===A.length&&A.push({position:b.touches[b.isHorizontal()?"startX":"startY"],time:M}),A.push({position:b.touches[b.isHorizontal()?"currentX":"currentY"],time:(new window.Date).getTime()})),b.updateProgress(P),b.setWrapperTranslate(P)}}}}}},b.onTouchEnd=function(e){if(e.originalEvent&&(e=e.originalEvent),z&&b.emit("onTouchEnd",b,e),z=!1,S){b.params.grabCursor&&C&&S&&(b.container[0].style.cursor="move",b.container[0].style.cursor="-webkit-grab",b.container[0].style.cursor="-moz-grab",b.container[0].style.cursor="grab");var t=Date.now(),r=t-M;if(b.allowClick&&(b.updateClickedSlide(e),b.emit("onTap",b,e),300>r&&t-H>300&&(L&&clearTimeout(L),L=setTimeout(function(){b&&(b.params.paginationHide&&b.paginationContainer.length>0&&!a(e.target).hasClass(b.params.bulletClass)&&b.paginationContainer.toggleClass(b.params.paginationHiddenClass),b.emit("onClick",b,e))},300)),300>r&&300>t-H&&(L&&clearTimeout(L),b.emit("onDoubleTap",b,e))),H=Date.now(),setTimeout(function(){b&&(b.allowClick=!0)},0),!S||!C||!b.swipeDirection||0===b.touches.diff||P===k)return void(S=C=!1);S=C=!1;var i;if(i=b.params.followFinger?b.rtl?b.translate:-b.translate:-P,b.params.freeMode){if(i<-b.minTranslate())return void b.slideTo(b.activeIndex);if(i>-b.maxTranslate())return void(b.slides.length<b.snapGrid.length?b.slideTo(b.snapGrid.length-1):b.slideTo(b.slides.length-1));if(b.params.freeModeMomentum){if(A.length>1){var s=A.pop(),n=A.pop(),o=s.position-n.position,l=s.time-n.time;b.velocity=o/l,b.velocity=b.velocity/2,Math.abs(b.velocity)<b.params.freeModeMinimumVelocity&&(b.velocity=0),(l>150||(new window.Date).getTime()-s.time>300)&&(b.velocity=0)}else b.velocity=0;A.length=0;var p=1e3*b.params.freeModeMomentumRatio,d=b.velocity*p,u=b.translate+d;b.rtl&&(u=-u);var c,m=!1,h=20*Math.abs(b.velocity)*b.params.freeModeMomentumBounceRatio;if(u<b.maxTranslate())b.params.freeModeMomentumBounce?(u+b.maxTranslate()<-h&&(u=b.maxTranslate()-h),c=b.maxTranslate(),m=!0,B=!0):u=b.maxTranslate();else if(u>b.minTranslate())b.params.freeModeMomentumBounce?(u-b.minTranslate()>h&&(u=b.minTranslate()+h),c=b.minTranslate(),m=!0,B=!0):u=b.minTranslate();else if(b.params.freeModeSticky){var f,g=0;for(g=0;g<b.snapGrid.length;g+=1)if(b.snapGrid[g]>-u){f=g;break}u=Math.abs(b.snapGrid[f]-u)<Math.abs(b.snapGrid[f-1]-u)||"next"===b.swipeDirection?b.snapGrid[f]:b.snapGrid[f-1],b.rtl||(u=-u)}if(0!==b.velocity)p=b.rtl?Math.abs((-u-b.translate)/b.velocity):Math.abs((u-b.translate)/b.velocity);else if(b.params.freeModeSticky)return void b.slideReset();b.params.freeModeMomentumBounce&&m?(b.updateProgress(c),b.setWrapperTransition(p),b.setWrapperTranslate(u),b.onTransitionStart(),b.animating=!0,b.wrapper.transitionEnd(function(){b&&B&&(b.emit("onMomentumBounce",b),b.setWrapperTransition(b.params.speed),b.setWrapperTranslate(c),b.wrapper.transitionEnd(function(){b&&b.onTransitionEnd()}))})):b.velocity?(b.updateProgress(u),b.setWrapperTransition(p),b.setWrapperTranslate(u),b.onTransitionStart(),b.animating||(b.animating=!0,b.wrapper.transitionEnd(function(){b&&b.onTransitionEnd()}))):b.updateProgress(u),b.updateActiveIndex()}return void((!b.params.freeModeMomentum||r>=b.params.longSwipesMs)&&(b.updateProgress(),b.updateActiveIndex()))}var v,w=0,y=b.slidesSizesGrid[0];for(v=0;v<b.slidesGrid.length;v+=b.params.slidesPerGroup)"undefined"!=typeof b.slidesGrid[v+b.params.slidesPerGroup]?i>=b.slidesGrid[v]&&i<b.slidesGrid[v+b.params.slidesPerGroup]&&(w=v,y=b.slidesGrid[v+b.params.slidesPerGroup]-b.slidesGrid[v]):i>=b.slidesGrid[v]&&(w=v,y=b.slidesGrid[b.slidesGrid.length-1]-b.slidesGrid[b.slidesGrid.length-2]);var x=(i-b.slidesGrid[w])/y;if(r>b.params.longSwipesMs){if(!b.params.longSwipes)return void b.slideTo(b.activeIndex);"next"===b.swipeDirection&&(x>=b.params.longSwipesRatio?b.slideTo(w+b.params.slidesPerGroup):b.slideTo(w)),"prev"===b.swipeDirection&&(x>1-b.params.longSwipesRatio?b.slideTo(w+b.params.slidesPerGroup):b.slideTo(w))}else{if(!b.params.shortSwipes)return void b.slideTo(b.activeIndex);"next"===b.swipeDirection&&b.slideTo(w+b.params.slidesPerGroup),"prev"===b.swipeDirection&&b.slideTo(w)}}},b._slideTo=function(e,a){return b.slideTo(e,a,!0,!0)},b.slideTo=function(e,a,t,r){"undefined"==typeof t&&(t=!0),"undefined"==typeof e&&(e=0),0>e&&(e=0),b.snapIndex=Math.floor(e/b.params.slidesPerGroup),b.snapIndex>=b.snapGrid.length&&(b.snapIndex=b.snapGrid.length-1);var i=-b.snapGrid[b.snapIndex];b.params.autoplay&&b.autoplaying&&(r||!b.params.autoplayDisableOnInteraction?b.pauseAutoplay(a):b.stopAutoplay()),b.updateProgress(i);for(var s=0;s<b.slidesGrid.length;s++)-Math.floor(100*i)>=Math.floor(100*b.slidesGrid[s])&&(e=s);return!b.params.allowSwipeToNext&&i<b.translate&&i<b.minTranslate()?!1:!b.params.allowSwipeToPrev&&i>b.translate&&i>b.maxTranslate()&&(b.activeIndex||0)!==e?!1:("undefined"==typeof a&&(a=b.params.speed),b.previousIndex=b.activeIndex||0,b.activeIndex=e,b.rtl&&-i===b.translate||!b.rtl&&i===b.translate?(b.params.autoHeight&&b.updateAutoHeight(),b.updateClasses(),"slide"!==b.params.effect&&b.setWrapperTranslate(i),!1):(b.updateClasses(),b.onTransitionStart(t),0===a?(b.setWrapperTranslate(i),b.setWrapperTransition(0),b.onTransitionEnd(t)):(b.setWrapperTranslate(i),b.setWrapperTransition(a),b.animating||(b.animating=!0,b.wrapper.transitionEnd(function(){b&&b.onTransitionEnd(t)}))),!0))},b.onTransitionStart=function(e){"undefined"==typeof e&&(e=!0),b.params.autoHeight&&b.updateAutoHeight(),b.lazy&&b.lazy.onTransitionStart(),e&&(b.emit("onTransitionStart",b),b.activeIndex!==b.previousIndex&&(b.emit("onSlideChangeStart",b),b.activeIndex>b.previousIndex?b.emit("onSlideNextStart",b):b.emit("onSlidePrevStart",b)))},b.onTransitionEnd=function(e){b.animating=!1,b.setWrapperTransition(0),"undefined"==typeof e&&(e=!0),b.lazy&&b.lazy.onTransitionEnd(),e&&(b.emit("onTransitionEnd",b),b.activeIndex!==b.previousIndex&&(b.emit("onSlideChangeEnd",b),b.activeIndex>b.previousIndex?b.emit("onSlideNextEnd",b):b.emit("onSlidePrevEnd",b))),b.params.hashnav&&b.hashnav&&b.hashnav.setHash()},b.slideNext=function(e,a,t){if(b.params.loop){if(b.animating)return!1;b.fixLoop();b.container[0].clientLeft;return b.slideTo(b.activeIndex+b.params.slidesPerGroup,a,e,t)}return b.slideTo(b.activeIndex+b.params.slidesPerGroup,a,e,t)},b._slideNext=function(e){return b.slideNext(!0,e,!0)},b.slidePrev=function(e,a,t){if(b.params.loop){if(b.animating)return!1;b.fixLoop();b.container[0].clientLeft;return b.slideTo(b.activeIndex-1,a,e,t)}return b.slideTo(b.activeIndex-1,a,e,t)},b._slidePrev=function(e){return b.slidePrev(!0,e,!0)},b.slideReset=function(e,a,t){return b.slideTo(b.activeIndex,a,e)},b.setWrapperTransition=function(e,a){b.wrapper.transition(e),"slide"!==b.params.effect&&b.effects[b.params.effect]&&b.effects[b.params.effect].setTransition(e),b.params.parallax&&b.parallax&&b.parallax.setTransition(e),b.params.scrollbar&&b.scrollbar&&b.scrollbar.setTransition(e),b.params.control&&b.controller&&b.controller.setTransition(e,a),b.emit("onSetTransition",b,e)},b.setWrapperTranslate=function(e,a,t){var r=0,i=0,n=0;b.isHorizontal()?r=b.rtl?-e:e:i=e,b.params.roundLengths&&(r=s(r),i=s(i)),b.params.virtualTranslate||(b.support.transforms3d?b.wrapper.transform("translate3d("+r+"px, "+i+"px, "+n+"px)"):b.wrapper.transform("translate("+r+"px, "+i+"px)")),b.translate=b.isHorizontal()?r:i;var o,l=b.maxTranslate()-b.minTranslate();o=0===l?0:(e-b.minTranslate())/l,o!==b.progress&&b.updateProgress(e),a&&b.updateActiveIndex(),"slide"!==b.params.effect&&b.effects[b.params.effect]&&b.effects[b.params.effect].setTranslate(b.translate),b.params.parallax&&b.parallax&&b.parallax.setTranslate(b.translate),b.params.scrollbar&&b.scrollbar&&b.scrollbar.setTranslate(b.translate),b.params.control&&b.controller&&b.controller.setTranslate(b.translate,t),b.emit("onSetTranslate",b,b.translate)},b.getTranslate=function(e,a){var t,r,i,s;return"undefined"==typeof a&&(a="x"),b.params.virtualTranslate?b.rtl?-b.translate:b.translate:(i=window.getComputedStyle(e,null),window.WebKitCSSMatrix?(r=i.transform||i.webkitTransform,r.split(",").length>6&&(r=r.split(", ").map(function(e){return e.replace(",",".")}).join(", ")),s=new window.WebKitCSSMatrix("none"===r?"":r)):(s=i.MozTransform||i.OTransform||i.MsTransform||i.msTransform||i.transform||i.getPropertyValue("transform").replace("translate(","matrix(1, 0, 0, 1,"),t=s.toString().split(",")),"x"===a&&(r=window.WebKitCSSMatrix?s.m41:16===t.length?parseFloat(t[12]):parseFloat(t[4])),"y"===a&&(r=window.WebKitCSSMatrix?s.m42:16===t.length?parseFloat(t[13]):parseFloat(t[5])),b.rtl&&r&&(r=-r),r||0)},b.getWrapperTranslate=function(e){return"undefined"==typeof e&&(e=b.isHorizontal()?"x":"y"),b.getTranslate(b.wrapper[0],e)},b.observers=[],b.initObservers=function(){if(b.params.observeParents)for(var e=b.container.parents(),a=0;a<e.length;a++)l(e[a]);l(b.container[0],{childList:!1}),l(b.wrapper[0],{attributes:!1})},b.disconnectObservers=function(){for(var e=0;e<b.observers.length;e++)b.observers[e].disconnect();b.observers=[]},b.createLoop=function(){b.wrapper.children("."+b.params.slideClass+"."+b.params.slideDuplicateClass).remove();var e=b.wrapper.children("."+b.params.slideClass);"auto"!==b.params.slidesPerView||b.params.loopedSlides||(b.params.loopedSlides=e.length),b.loopedSlides=parseInt(b.params.loopedSlides||b.params.slidesPerView,10),b.loopedSlides=b.loopedSlides+b.params.loopAdditionalSlides,b.loopedSlides>e.length&&(b.loopedSlides=e.length);var t,r=[],i=[];for(e.each(function(t,s){var n=a(this);t<b.loopedSlides&&i.push(s),t<e.length&&t>=e.length-b.loopedSlides&&r.push(s),n.attr("data-swiper-slide-index",t)}),t=0;t<i.length;t++)b.wrapper.append(a(i[t].cloneNode(!0)).addClass(b.params.slideDuplicateClass));for(t=r.length-1;t>=0;t--)b.wrapper.prepend(a(r[t].cloneNode(!0)).addClass(b.params.slideDuplicateClass))},b.destroyLoop=function(){b.wrapper.children("."+b.params.slideClass+"."+b.params.slideDuplicateClass).remove(),b.slides.removeAttr("data-swiper-slide-index")},b.reLoop=function(e){var a=b.activeIndex-b.loopedSlides;b.destroyLoop(),b.createLoop(),b.updateSlidesSize(),e&&b.slideTo(a+b.loopedSlides,0,!1)},b.fixLoop=function(){var e;b.activeIndex<b.loopedSlides?(e=b.slides.length-3*b.loopedSlides+b.activeIndex,e+=b.loopedSlides,b.slideTo(e,0,!1,!0)):("auto"===b.params.slidesPerView&&b.activeIndex>=2*b.loopedSlides||b.activeIndex>b.slides.length-2*b.params.slidesPerView)&&(e=-b.slides.length+b.activeIndex+b.loopedSlides,e+=b.loopedSlides,b.slideTo(e,0,!1,!0))},b.appendSlide=function(e){if(b.params.loop&&b.destroyLoop(),"object"==typeof e&&e.length)for(var a=0;a<e.length;a++)e[a]&&b.wrapper.append(e[a]);else b.wrapper.append(e);b.params.loop&&b.createLoop(),b.params.observer&&b.support.observer||b.update(!0)},b.prependSlide=function(e){b.params.loop&&b.destroyLoop();var a=b.activeIndex+1;if("object"==typeof e&&e.length){for(var t=0;t<e.length;t++)e[t]&&b.wrapper.prepend(e[t]);a=b.activeIndex+e.length}else b.wrapper.prepend(e);b.params.loop&&b.createLoop(),b.params.observer&&b.support.observer||b.update(!0),b.slideTo(a,0,!1)},b.removeSlide=function(e){b.params.loop&&(b.destroyLoop(),b.slides=b.wrapper.children("."+b.params.slideClass));var a,t=b.activeIndex;if("object"==typeof e&&e.length){for(var r=0;r<e.length;r++)a=e[r],b.slides[a]&&b.slides.eq(a).remove(),t>a&&t--;t=Math.max(t,0)}else a=e,b.slides[a]&&b.slides.eq(a).remove(),t>a&&t--,t=Math.max(t,0);b.params.loop&&b.createLoop(),b.params.observer&&b.support.observer||b.update(!0),b.params.loop?b.slideTo(t+b.loopedSlides,0,!1):b.slideTo(t,0,!1)},b.removeAllSlides=function(){for(var e=[],a=0;a<b.slides.length;a++)e.push(a);b.removeSlide(e)},b.effects={fade:{setTranslate:function(){for(var e=0;e<b.slides.length;e++){var a=b.slides.eq(e),t=a[0].swiperSlideOffset,r=-t;b.params.virtualTranslate||(r-=b.translate);var i=0;b.isHorizontal()||(i=r,r=0);var s=b.params.fade.crossFade?Math.max(1-Math.abs(a[0].progress),0):1+Math.min(Math.max(a[0].progress,-1),0);a.css({opacity:s}).transform("translate3d("+r+"px, "+i+"px, 0px)")}},setTransition:function(e){if(b.slides.transition(e),b.params.virtualTranslate&&0!==e){var a=!1;b.slides.transitionEnd(function(){if(!a&&b){a=!0,b.animating=!1;for(var e=["webkitTransitionEnd","transitionend","oTransitionEnd","MSTransitionEnd","msTransitionEnd"],t=0;t<e.length;t++)b.wrapper.trigger(e[t])}})}}},flip:{setTranslate:function(){for(var e=0;e<b.slides.length;e++){var t=b.slides.eq(e),r=t[0].progress;b.params.flip.limitRotation&&(r=Math.max(Math.min(t[0].progress,1),-1));var i=t[0].swiperSlideOffset,s=-180*r,n=s,o=0,l=-i,p=0;if(b.isHorizontal()?b.rtl&&(n=-n):(p=l,l=0,o=-n,n=0),t[0].style.zIndex=-Math.abs(Math.round(r))+b.slides.length,b.params.flip.slideShadows){var d=b.isHorizontal()?t.find(".swiper-slide-shadow-left"):t.find(".swiper-slide-shadow-top"),u=b.isHorizontal()?t.find(".swiper-slide-shadow-right"):t.find(".swiper-slide-shadow-bottom");0===d.length&&(d=a('<div class="swiper-slide-shadow-'+(b.isHorizontal()?"left":"top")+'"></div>'),t.append(d)),0===u.length&&(u=a('<div class="swiper-slide-shadow-'+(b.isHorizontal()?"right":"bottom")+'"></div>'),t.append(u)),d.length&&(d[0].style.opacity=Math.max(-r,0)),u.length&&(u[0].style.opacity=Math.max(r,0))}t.transform("translate3d("+l+"px, "+p+"px, 0px) rotateX("+o+"deg) rotateY("+n+"deg)")}},setTransition:function(e){if(b.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e),b.params.virtualTranslate&&0!==e){var t=!1;b.slides.eq(b.activeIndex).transitionEnd(function(){if(!t&&b&&a(this).hasClass(b.params.slideActiveClass)){t=!0,b.animating=!1;for(var e=["webkitTransitionEnd","transitionend","oTransitionEnd","MSTransitionEnd","msTransitionEnd"],r=0;r<e.length;r++)b.wrapper.trigger(e[r])}})}}},cube:{setTranslate:function(){var e,t=0;b.params.cube.shadow&&(b.isHorizontal()?(e=b.wrapper.find(".swiper-cube-shadow"),0===e.length&&(e=a('<div class="swiper-cube-shadow"></div>'),b.wrapper.append(e)),e.css({height:b.width+"px"})):(e=b.container.find(".swiper-cube-shadow"),0===e.length&&(e=a('<div class="swiper-cube-shadow"></div>'),b.container.append(e))));for(var r=0;r<b.slides.length;r++){var i=b.slides.eq(r),s=90*r,n=Math.floor(s/360);b.rtl&&(s=-s,n=Math.floor(-s/360));var o=Math.max(Math.min(i[0].progress,1),-1),l=0,p=0,d=0;r%4===0?(l=4*-n*b.size,d=0):(r-1)%4===0?(l=0,d=4*-n*b.size):(r-2)%4===0?(l=b.size+4*n*b.size,d=b.size):(r-3)%4===0&&(l=-b.size,d=3*b.size+4*b.size*n),b.rtl&&(l=-l),b.isHorizontal()||(p=l,l=0);var u="rotateX("+(b.isHorizontal()?0:-s)+"deg) rotateY("+(b.isHorizontal()?s:0)+"deg) translate3d("+l+"px, "+p+"px, "+d+"px)";if(1>=o&&o>-1&&(t=90*r+90*o,b.rtl&&(t=90*-r-90*o)),i.transform(u),b.params.cube.slideShadows){var c=b.isHorizontal()?i.find(".swiper-slide-shadow-left"):i.find(".swiper-slide-shadow-top"),m=b.isHorizontal()?i.find(".swiper-slide-shadow-right"):i.find(".swiper-slide-shadow-bottom");0===c.length&&(c=a('<div class="swiper-slide-shadow-'+(b.isHorizontal()?"left":"top")+'"></div>'),i.append(c)),0===m.length&&(m=a('<div class="swiper-slide-shadow-'+(b.isHorizontal()?"right":"bottom")+'"></div>'),i.append(m)),c.length&&(c[0].style.opacity=Math.max(-o,0)),m.length&&(m[0].style.opacity=Math.max(o,0))}}if(b.wrapper.css({"-webkit-transform-origin":"50% 50% -"+b.size/2+"px","-moz-transform-origin":"50% 50% -"+b.size/2+"px","-ms-transform-origin":"50% 50% -"+b.size/2+"px","transform-origin":"50% 50% -"+b.size/2+"px"}),b.params.cube.shadow)if(b.isHorizontal())e.transform("translate3d(0px, "+(b.width/2+b.params.cube.shadowOffset)+"px, "+-b.width/2+"px) rotateX(90deg) rotateZ(0deg) scale("+b.params.cube.shadowScale+")");else{var h=Math.abs(t)-90*Math.floor(Math.abs(t)/90),f=1.5-(Math.sin(2*h*Math.PI/360)/2+Math.cos(2*h*Math.PI/360)/2),g=b.params.cube.shadowScale,v=b.params.cube.shadowScale/f,w=b.params.cube.shadowOffset;e.transform("scale3d("+g+", 1, "+v+") translate3d(0px, "+(b.height/2+w)+"px, "+-b.height/2/v+"px) rotateX(-90deg)")}var y=b.isSafari||b.isUiWebView?-b.size/2:0;b.wrapper.transform("translate3d(0px,0,"+y+"px) rotateX("+(b.isHorizontal()?0:t)+"deg) rotateY("+(b.isHorizontal()?-t:0)+"deg)")},setTransition:function(e){b.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e),b.params.cube.shadow&&!b.isHorizontal()&&b.container.find(".swiper-cube-shadow").transition(e)}},coverflow:{setTranslate:function(){for(var e=b.translate,t=b.isHorizontal()?-e+b.width/2:-e+b.height/2,r=b.isHorizontal()?b.params.coverflow.rotate:-b.params.coverflow.rotate,i=b.params.coverflow.depth,s=0,n=b.slides.length;n>s;s++){var o=b.slides.eq(s),l=b.slidesSizesGrid[s],p=o[0].swiperSlideOffset,d=(t-p-l/2)/l*b.params.coverflow.modifier,u=b.isHorizontal()?r*d:0,c=b.isHorizontal()?0:r*d,m=-i*Math.abs(d),h=b.isHorizontal()?0:b.params.coverflow.stretch*d,f=b.isHorizontal()?b.params.coverflow.stretch*d:0;Math.abs(f)<.001&&(f=0),Math.abs(h)<.001&&(h=0),Math.abs(m)<.001&&(m=0),Math.abs(u)<.001&&(u=0),Math.abs(c)<.001&&(c=0);var g="translate3d("+f+"px,"+h+"px,"+m+"px)  rotateX("+c+"deg) rotateY("+u+"deg)";if(o.transform(g),o[0].style.zIndex=-Math.abs(Math.round(d))+1,b.params.coverflow.slideShadows){var v=b.isHorizontal()?o.find(".swiper-slide-shadow-left"):o.find(".swiper-slide-shadow-top"),w=b.isHorizontal()?o.find(".swiper-slide-shadow-right"):o.find(".swiper-slide-shadow-bottom");0===v.length&&(v=a('<div class="swiper-slide-shadow-'+(b.isHorizontal()?"left":"top")+'"></div>'),o.append(v)),0===w.length&&(w=a('<div class="swiper-slide-shadow-'+(b.isHorizontal()?"right":"bottom")+'"></div>'),o.append(w)),v.length&&(v[0].style.opacity=d>0?d:0),w.length&&(w[0].style.opacity=-d>0?-d:0)}}if(b.browser.ie){var y=b.wrapper[0].style;y.perspectiveOrigin=t+"px 50%"}},setTransition:function(e){b.slides.transition(e).find(".swiper-slide-shadow-top, .swiper-slide-shadow-right, .swiper-slide-shadow-bottom, .swiper-slide-shadow-left").transition(e)}}},b.lazy={initialImageLoaded:!1,loadImageInSlide:function(e,t){if("undefined"!=typeof e&&("undefined"==typeof t&&(t=!0),0!==b.slides.length)){var r=b.slides.eq(e),i=r.find(".swiper-lazy:not(.swiper-lazy-loaded):not(.swiper-lazy-loading)");!r.hasClass("swiper-lazy")||r.hasClass("swiper-lazy-loaded")||r.hasClass("swiper-lazy-loading")||(i=i.add(r[0])),0!==i.length&&i.each(function(){var e=a(this);e.addClass("swiper-lazy-loading");var i=e.attr("data-background"),s=e.attr("data-src"),n=e.attr("data-srcset");b.loadImage(e[0],s||i,n,!1,function(){if(i?(e.css("background-image",'url("'+i+'")'),e.removeAttr("data-background")):(n&&(e.attr("srcset",n),e.removeAttr("data-srcset")),s&&(e.attr("src",s),e.removeAttr("data-src"))),e.addClass("swiper-lazy-loaded").removeClass("swiper-lazy-loading"),r.find(".swiper-lazy-preloader, .preloader").remove(),b.params.loop&&t){var a=r.attr("data-swiper-slide-index");if(r.hasClass(b.params.slideDuplicateClass)){var o=b.wrapper.children('[data-swiper-slide-index="'+a+'"]:not(.'+b.params.slideDuplicateClass+")");b.lazy.loadImageInSlide(o.index(),!1)}else{var l=b.wrapper.children("."+b.params.slideDuplicateClass+'[data-swiper-slide-index="'+a+'"]');b.lazy.loadImageInSlide(l.index(),!1)}}b.emit("onLazyImageReady",b,r[0],e[0])}),b.emit("onLazyImageLoad",b,r[0],e[0])})}},load:function(){var e;if(b.params.watchSlidesVisibility)b.wrapper.children("."+b.params.slideVisibleClass).each(function(){b.lazy.loadImageInSlide(a(this).index())});else if(b.params.slidesPerView>1)for(e=b.activeIndex;e<b.activeIndex+b.params.slidesPerView;e++)b.slides[e]&&b.lazy.loadImageInSlide(e);else b.lazy.loadImageInSlide(b.activeIndex);if(b.params.lazyLoadingInPrevNext)if(b.params.slidesPerView>1||b.params.lazyLoadingInPrevNextAmount&&b.params.lazyLoadingInPrevNextAmount>1){var t=b.params.lazyLoadingInPrevNextAmount,r=b.params.slidesPerView,i=Math.min(b.activeIndex+r+Math.max(t,r),b.slides.length),s=Math.max(b.activeIndex-Math.max(r,t),0);for(e=b.activeIndex+b.params.slidesPerView;i>e;e++)b.slides[e]&&b.lazy.loadImageInSlide(e);for(e=s;e<b.activeIndex;e++)b.slides[e]&&b.lazy.loadImageInSlide(e)}else{var n=b.wrapper.children("."+b.params.slideNextClass);n.length>0&&b.lazy.loadImageInSlide(n.index());var o=b.wrapper.children("."+b.params.slidePrevClass);o.length>0&&b.lazy.loadImageInSlide(o.index())}},onTransitionStart:function(){b.params.lazyLoading&&(b.params.lazyLoadingOnTransitionStart||!b.params.lazyLoadingOnTransitionStart&&!b.lazy.initialImageLoaded)&&b.lazy.load()},onTransitionEnd:function(){b.params.lazyLoading&&!b.params.lazyLoadingOnTransitionStart&&b.lazy.load()}},b.scrollbar={isTouched:!1,setDragPosition:function(e){var a=b.scrollbar,t=b.isHorizontal()?"touchstart"===e.type||"touchmove"===e.type?e.targetTouches[0].pageX:e.pageX||e.clientX:"touchstart"===e.type||"touchmove"===e.type?e.targetTouches[0].pageY:e.pageY||e.clientY,r=t-a.track.offset()[b.isHorizontal()?"left":"top"]-a.dragSize/2,i=-b.minTranslate()*a.moveDivider,s=-b.maxTranslate()*a.moveDivider;i>r?r=i:r>s&&(r=s),r=-r/a.moveDivider,b.updateProgress(r),b.setWrapperTranslate(r,!0)},dragStart:function(e){var a=b.scrollbar;a.isTouched=!0,e.preventDefault(),e.stopPropagation(),a.setDragPosition(e),clearTimeout(a.dragTimeout),a.track.transition(0),b.params.scrollbarHide&&a.track.css("opacity",1),b.wrapper.transition(100),a.drag.transition(100),b.emit("onScrollbarDragStart",b)},dragMove:function(e){var a=b.scrollbar;a.isTouched&&(e.preventDefault?e.preventDefault():e.returnValue=!1,a.setDragPosition(e),b.wrapper.transition(0),a.track.transition(0),a.drag.transition(0),b.emit("onScrollbarDragMove",b))},dragEnd:function(e){var a=b.scrollbar;a.isTouched&&(a.isTouched=!1,b.params.scrollbarHide&&(clearTimeout(a.dragTimeout),a.dragTimeout=setTimeout(function(){a.track.css("opacity",0),a.track.transition(400)},1e3)),b.emit("onScrollbarDragEnd",b),b.params.scrollbarSnapOnRelease&&b.slideReset())},enableDraggable:function(){var e=b.scrollbar,t=b.support.touch?e.track:document;a(e.track).on(b.touchEvents.start,e.dragStart),a(t).on(b.touchEvents.move,e.dragMove),a(t).on(b.touchEvents.end,e.dragEnd)},disableDraggable:function(){var e=b.scrollbar,t=b.support.touch?e.track:document;a(e.track).off(b.touchEvents.start,e.dragStart),a(t).off(b.touchEvents.move,e.dragMove),a(t).off(b.touchEvents.end,e.dragEnd)},set:function(){if(b.params.scrollbar){var e=b.scrollbar;e.track=a(b.params.scrollbar),b.params.uniqueNavElements&&"string"==typeof b.params.scrollbar&&e.track.length>1&&1===b.container.find(b.params.scrollbar).length&&(e.track=b.container.find(b.params.scrollbar)),e.drag=e.track.find(".swiper-scrollbar-drag"),0===e.drag.length&&(e.drag=a('<div class="swiper-scrollbar-drag"></div>'),e.track.append(e.drag)),e.drag[0].style.width="",e.drag[0].style.height="",e.trackSize=b.isHorizontal()?e.track[0].offsetWidth:e.track[0].offsetHeight,e.divider=b.size/b.virtualSize,e.moveDivider=e.divider*(e.trackSize/b.size),e.dragSize=e.trackSize*e.divider,b.isHorizontal()?e.drag[0].style.width=e.dragSize+"px":e.drag[0].style.height=e.dragSize+"px",e.divider>=1?e.track[0].style.display="none":e.track[0].style.display="",b.params.scrollbarHide&&(e.track[0].style.opacity=0)}},setTranslate:function(){if(b.params.scrollbar){var e,a=b.scrollbar,t=(b.translate||0,a.dragSize);e=(a.trackSize-a.dragSize)*b.progress,b.rtl&&b.isHorizontal()?(e=-e,e>0?(t=a.dragSize-e,e=0):-e+a.dragSize>a.trackSize&&(t=a.trackSize+e)):0>e?(t=a.dragSize+e,e=0):e+a.dragSize>a.trackSize&&(t=a.trackSize-e),b.isHorizontal()?(b.support.transforms3d?a.drag.transform("translate3d("+e+"px, 0, 0)"):a.drag.transform("translateX("+e+"px)"),a.drag[0].style.width=t+"px"):(b.support.transforms3d?a.drag.transform("translate3d(0px, "+e+"px, 0)"):a.drag.transform("translateY("+e+"px)"),a.drag[0].style.height=t+"px"),b.params.scrollbarHide&&(clearTimeout(a.timeout),a.track[0].style.opacity=1,a.timeout=setTimeout(function(){a.track[0].style.opacity=0,a.track.transition(400)},1e3))}},setTransition:function(e){b.params.scrollbar&&b.scrollbar.drag.transition(e)}},b.controller={LinearSpline:function(e,a){this.x=e,this.y=a,this.lastIndex=e.length-1;var t,r;this.x.length;this.interpolate=function(e){return e?(r=i(this.x,e),t=r-1,(e-this.x[t])*(this.y[r]-this.y[t])/(this.x[r]-this.x[t])+this.y[t]):0};var i=function(){var e,a,t;return function(r,i){for(a=-1,e=r.length;e-a>1;)r[t=e+a>>1]<=i?a=t:e=t;return e}}()},getInterpolateFunction:function(e){b.controller.spline||(b.controller.spline=b.params.loop?new b.controller.LinearSpline(b.slidesGrid,e.slidesGrid):new b.controller.LinearSpline(b.snapGrid,e.snapGrid))},setTranslate:function(e,a){function r(a){e=a.rtl&&"horizontal"===a.params.direction?-b.translate:b.translate,"slide"===b.params.controlBy&&(b.controller.getInterpolateFunction(a),s=-b.controller.spline.interpolate(-e)),s&&"container"!==b.params.controlBy||(i=(a.maxTranslate()-a.minTranslate())/(b.maxTranslate()-b.minTranslate()),s=(e-b.minTranslate())*i+a.minTranslate()),b.params.controlInverse&&(s=a.maxTranslate()-s),a.updateProgress(s),a.setWrapperTranslate(s,!1,b),a.updateActiveIndex()}var i,s,n=b.params.control;if(b.isArray(n))for(var o=0;o<n.length;o++)n[o]!==a&&n[o]instanceof t&&r(n[o]);else n instanceof t&&a!==n&&r(n)},setTransition:function(e,a){function r(a){a.setWrapperTransition(e,b),0!==e&&(a.onTransitionStart(),a.wrapper.transitionEnd(function(){s&&(a.params.loop&&"slide"===b.params.controlBy&&a.fixLoop(),a.onTransitionEnd())}))}var i,s=b.params.control;if(b.isArray(s))for(i=0;i<s.length;i++)s[i]!==a&&s[i]instanceof t&&r(s[i]);else s instanceof t&&a!==s&&r(s)}},b.hashnav={init:function(){if(b.params.hashnav){b.hashnav.initialized=!0;var e=document.location.hash.replace("#","");if(e)for(var a=0,t=0,r=b.slides.length;r>t;t++){var i=b.slides.eq(t),s=i.attr("data-hash");if(s===e&&!i.hasClass(b.params.slideDuplicateClass)){var n=i.index();b.slideTo(n,a,b.params.runCallbacksOnInit,!0)}}}},setHash:function(){b.hashnav.initialized&&b.params.hashnav&&(document.location.hash=b.slides.eq(b.activeIndex).attr("data-hash")||"")}},b.disableKeyboardControl=function(){b.params.keyboardControl=!1,a(document).off("keydown",p)},b.enableKeyboardControl=function(){b.params.keyboardControl=!0,a(document).on("keydown",p)},b.mousewheel={event:!1,lastScrollTime:(new window.Date).getTime()},b.params.mousewheelControl){try{new window.WheelEvent("wheel"),b.mousewheel.event="wheel"}catch(N){(window.WheelEvent||b.container[0]&&"wheel"in b.container[0])&&(b.mousewheel.event="wheel")}!b.mousewheel.event&&window.WheelEvent,b.mousewheel.event||void 0===document.onmousewheel||(b.mousewheel.event="mousewheel"),b.mousewheel.event||(b.mousewheel.event="DOMMouseScroll")}b.disableMousewheelControl=function(){return b.mousewheel.event?(b.container.off(b.mousewheel.event,d),!0):!1},b.enableMousewheelControl=function(){return b.mousewheel.event?(b.container.on(b.mousewheel.event,d),!0):!1},b.parallax={setTranslate:function(){b.container.children("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function(){u(this,b.progress)}),b.slides.each(function(){var e=a(this);e.find("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function(){var a=Math.min(Math.max(e[0].progress,-1),1);u(this,a)})})},setTransition:function(e){"undefined"==typeof e&&(e=b.params.speed),b.container.find("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]").each(function(){var t=a(this),r=parseInt(t.attr("data-swiper-parallax-duration"),10)||e;0===e&&(r=0),t.transition(r)})}},b._plugins=[];for(var R in b.plugins){var W=b.plugins[R](b,b.params[R]);W&&b._plugins.push(W)}return b.callPlugins=function(e){for(var a=0;a<b._plugins.length;a++)e in b._plugins[a]&&b._plugins[a][e](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5])},b.emitterEventListeners={},b.emit=function(e){b.params[e]&&b.params[e](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);var a;if(b.emitterEventListeners[e])for(a=0;a<b.emitterEventListeners[e].length;a++)b.emitterEventListeners[e][a](arguments[1],arguments[2],arguments[3],arguments[4],arguments[5]);b.callPlugins&&b.callPlugins(e,arguments[1],arguments[2],arguments[3],arguments[4],arguments[5])},b.on=function(e,a){return e=c(e),b.emitterEventListeners[e]||(b.emitterEventListeners[e]=[]),b.emitterEventListeners[e].push(a),b},b.off=function(e,a){var t;if(e=c(e),"undefined"==typeof a)return b.emitterEventListeners[e]=[],b;if(b.emitterEventListeners[e]&&0!==b.emitterEventListeners[e].length){for(t=0;t<b.emitterEventListeners[e].length;t++)b.emitterEventListeners[e][t]===a&&b.emitterEventListeners[e].splice(t,1);return b}},b.once=function(e,a){e=c(e);var t=function(){a(arguments[0],arguments[1],arguments[2],arguments[3],arguments[4]),b.off(e,t)};return b.on(e,t),b},b.a11y={makeFocusable:function(e){return e.attr("tabIndex","0"),e},addRole:function(e,a){return e.attr("role",a),e},addLabel:function(e,a){return e.attr("aria-label",a),e},disable:function(e){return e.attr("aria-disabled",!0),e},enable:function(e){return e.attr("aria-disabled",!1),e},onEnterKey:function(e){13===e.keyCode&&(a(e.target).is(b.params.nextButton)?(b.onClickNext(e),b.isEnd?b.a11y.notify(b.params.lastSlideMessage):b.a11y.notify(b.params.nextSlideMessage)):a(e.target).is(b.params.prevButton)&&(b.onClickPrev(e),b.isBeginning?b.a11y.notify(b.params.firstSlideMessage):b.a11y.notify(b.params.prevSlideMessage)),a(e.target).is("."+b.params.bulletClass)&&a(e.target)[0].click())},liveRegion:a('<span class="swiper-notification" aria-live="assertive" aria-atomic="true"></span>'),notify:function(e){var a=b.a11y.liveRegion;0!==a.length&&(a.html(""),a.html(e))},init:function(){b.params.nextButton&&b.nextButton&&b.nextButton.length>0&&(b.a11y.makeFocusable(b.nextButton),b.a11y.addRole(b.nextButton,"button"),b.a11y.addLabel(b.nextButton,b.params.nextSlideMessage)),b.params.prevButton&&b.prevButton&&b.prevButton.length>0&&(b.a11y.makeFocusable(b.prevButton),b.a11y.addRole(b.prevButton,"button"),b.a11y.addLabel(b.prevButton,b.params.prevSlideMessage)),a(b.container).append(b.a11y.liveRegion)},initPagination:function(){b.params.pagination&&b.params.paginationClickable&&b.bullets&&b.bullets.length&&b.bullets.each(function(){var e=a(this);b.a11y.makeFocusable(e),b.a11y.addRole(e,"button"),b.a11y.addLabel(e,b.params.paginationBulletMessage.replace(/{{index}}/,e.index()+1))})},destroy:function(){b.a11y.liveRegion&&b.a11y.liveRegion.length>0&&b.a11y.liveRegion.remove()}},b.init=function(){b.params.loop&&b.createLoop(),b.updateContainerSize(),b.updateSlidesSize(),b.updatePagination(),b.params.scrollbar&&b.scrollbar&&(b.scrollbar.set(),b.params.scrollbarDraggable&&b.scrollbar.enableDraggable()),"slide"!==b.params.effect&&b.effects[b.params.effect]&&(b.params.loop||b.updateProgress(),b.effects[b.params.effect].setTranslate()),b.params.loop?b.slideTo(b.params.initialSlide+b.loopedSlides,0,b.params.runCallbacksOnInit):(b.slideTo(b.params.initialSlide,0,b.params.runCallbacksOnInit),0===b.params.initialSlide&&(b.parallax&&b.params.parallax&&b.parallax.setTranslate(),b.lazy&&b.params.lazyLoading&&(b.lazy.load(),b.lazy.initialImageLoaded=!0))),b.attachEvents(),b.params.observer&&b.support.observer&&b.initObservers(),b.params.preloadImages&&!b.params.lazyLoading&&b.preloadImages(),b.params.autoplay&&b.startAutoplay(),b.params.keyboardControl&&b.enableKeyboardControl&&b.enableKeyboardControl(),b.params.mousewheelControl&&b.enableMousewheelControl&&b.enableMousewheelControl(),
b.params.hashnav&&b.hashnav&&b.hashnav.init(),b.params.a11y&&b.a11y&&b.a11y.init(),b.emit("onInit",b)},b.cleanupStyles=function(){b.container.removeClass(b.classNames.join(" ")).removeAttr("style"),b.wrapper.removeAttr("style"),b.slides&&b.slides.length&&b.slides.removeClass([b.params.slideVisibleClass,b.params.slideActiveClass,b.params.slideNextClass,b.params.slidePrevClass].join(" ")).removeAttr("style").removeAttr("data-swiper-column").removeAttr("data-swiper-row"),b.paginationContainer&&b.paginationContainer.length&&b.paginationContainer.removeClass(b.params.paginationHiddenClass),b.bullets&&b.bullets.length&&b.bullets.removeClass(b.params.bulletActiveClass),b.params.prevButton&&a(b.params.prevButton).removeClass(b.params.buttonDisabledClass),b.params.nextButton&&a(b.params.nextButton).removeClass(b.params.buttonDisabledClass),b.params.scrollbar&&b.scrollbar&&(b.scrollbar.track&&b.scrollbar.track.length&&b.scrollbar.track.removeAttr("style"),b.scrollbar.drag&&b.scrollbar.drag.length&&b.scrollbar.drag.removeAttr("style"))},b.destroy=function(e,a){b.detachEvents(),b.stopAutoplay(),b.params.scrollbar&&b.scrollbar&&b.params.scrollbarDraggable&&b.scrollbar.disableDraggable(),b.params.loop&&b.destroyLoop(),a&&b.cleanupStyles(),b.disconnectObservers(),b.params.keyboardControl&&b.disableKeyboardControl&&b.disableKeyboardControl(),b.params.mousewheelControl&&b.disableMousewheelControl&&b.disableMousewheelControl(),b.params.a11y&&b.a11y&&b.a11y.destroy(),b.emit("onDestroy"),e!==!1&&(b=null)},b.init(),b}};t.prototype={isSafari:function(){var e=navigator.userAgent.toLowerCase();return e.indexOf("safari")>=0&&e.indexOf("chrome")<0&&e.indexOf("android")<0}(),isUiWebView:/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent),isArray:function(e){return"[object Array]"===Object.prototype.toString.apply(e)},browser:{ie:window.navigator.pointerEnabled||window.navigator.msPointerEnabled,ieTouch:window.navigator.msPointerEnabled&&window.navigator.msMaxTouchPoints>1||window.navigator.pointerEnabled&&window.navigator.maxTouchPoints>1},device:function(){var e=navigator.userAgent,a=e.match(/(Android);?[\s\/]+([\d.]+)?/),t=e.match(/(iPad).*OS\s([\d_]+)/),r=e.match(/(iPod)(.*OS\s([\d_]+))?/),i=!t&&e.match(/(iPhone\sOS)\s([\d_]+)/);return{ios:t||i||r,android:a}}(),support:{touch:window.Modernizr&&Modernizr.touch===!0||function(){return!!("ontouchstart"in window||window.DocumentTouch&&document instanceof DocumentTouch)}(),transforms3d:window.Modernizr&&Modernizr.csstransforms3d===!0||function(){var e=document.createElement("div").style;return"webkitPerspective"in e||"MozPerspective"in e||"OPerspective"in e||"MsPerspective"in e||"perspective"in e}(),flexbox:function(){for(var e=document.createElement("div").style,a="alignItems webkitAlignItems webkitBoxAlign msFlexAlign mozBoxAlign webkitFlexDirection msFlexDirection mozBoxDirection mozBoxOrient webkitBoxDirection webkitBoxOrient".split(" "),t=0;t<a.length;t++)if(a[t]in e)return!0}(),observer:function(){return"MutationObserver"in window||"WebkitMutationObserver"in window}()},plugins:{}};for(var r=(function(){var e=function(e){var a=this,t=0;for(t=0;t<e.length;t++)a[t]=e[t];return a.length=e.length,this},a=function(a,t){var r=[],i=0;if(a&&!t&&a instanceof e)return a;if(a)if("string"==typeof a){var s,n,o=a.trim();if(o.indexOf("<")>=0&&o.indexOf(">")>=0){var l="div";for(0===o.indexOf("<li")&&(l="ul"),0===o.indexOf("<tr")&&(l="tbody"),(0===o.indexOf("<td")||0===o.indexOf("<th"))&&(l="tr"),0===o.indexOf("<tbody")&&(l="table"),0===o.indexOf("<option")&&(l="select"),n=document.createElement(l),n.innerHTML=a,i=0;i<n.childNodes.length;i++)r.push(n.childNodes[i])}else for(s=t||"#"!==a[0]||a.match(/[ .<>:~]/)?(t||document).querySelectorAll(a):[document.getElementById(a.split("#")[1])],i=0;i<s.length;i++)s[i]&&r.push(s[i])}else if(a.nodeType||a===window||a===document)r.push(a);else if(a.length>0&&a[0].nodeType)for(i=0;i<a.length;i++)r.push(a[i]);return new e(r)};return e.prototype={addClass:function(e){if("undefined"==typeof e)return this;for(var a=e.split(" "),t=0;t<a.length;t++)for(var r=0;r<this.length;r++)this[r].classList.add(a[t]);return this},removeClass:function(e){for(var a=e.split(" "),t=0;t<a.length;t++)for(var r=0;r<this.length;r++)this[r].classList.remove(a[t]);return this},hasClass:function(e){return this[0]?this[0].classList.contains(e):!1},toggleClass:function(e){for(var a=e.split(" "),t=0;t<a.length;t++)for(var r=0;r<this.length;r++)this[r].classList.toggle(a[t]);return this},attr:function(e,a){if(1===arguments.length&&"string"==typeof e)return this[0]?this[0].getAttribute(e):void 0;for(var t=0;t<this.length;t++)if(2===arguments.length)this[t].setAttribute(e,a);else for(var r in e)this[t][r]=e[r],this[t].setAttribute(r,e[r]);return this},removeAttr:function(e){for(var a=0;a<this.length;a++)this[a].removeAttribute(e);return this},data:function(e,a){if("undefined"!=typeof a){for(var t=0;t<this.length;t++){var r=this[t];r.dom7ElementDataStorage||(r.dom7ElementDataStorage={}),r.dom7ElementDataStorage[e]=a}return this}if(this[0]){var i=this[0].getAttribute("data-"+e);return i?i:this[0].dom7ElementDataStorage&&e in this[0].dom7ElementDataStorage?this[0].dom7ElementDataStorage[e]:void 0}},transform:function(e){for(var a=0;a<this.length;a++){var t=this[a].style;t.webkitTransform=t.MsTransform=t.msTransform=t.MozTransform=t.OTransform=t.transform=e}return this},transition:function(e){"string"!=typeof e&&(e+="ms");for(var a=0;a<this.length;a++){var t=this[a].style;t.webkitTransitionDuration=t.MsTransitionDuration=t.msTransitionDuration=t.MozTransitionDuration=t.OTransitionDuration=t.transitionDuration=e}return this},on:function(e,t,r,i){function s(e){var i=e.target;if(a(i).is(t))r.call(i,e);else for(var s=a(i).parents(),n=0;n<s.length;n++)a(s[n]).is(t)&&r.call(s[n],e)}var n,o,l=e.split(" ");for(n=0;n<this.length;n++)if("function"==typeof t||t===!1)for("function"==typeof t&&(r=arguments[1],i=arguments[2]||!1),o=0;o<l.length;o++)this[n].addEventListener(l[o],r,i);else for(o=0;o<l.length;o++)this[n].dom7LiveListeners||(this[n].dom7LiveListeners=[]),this[n].dom7LiveListeners.push({listener:r,liveListener:s}),this[n].addEventListener(l[o],s,i);return this},off:function(e,a,t,r){for(var i=e.split(" "),s=0;s<i.length;s++)for(var n=0;n<this.length;n++)if("function"==typeof a||a===!1)"function"==typeof a&&(t=arguments[1],r=arguments[2]||!1),this[n].removeEventListener(i[s],t,r);else if(this[n].dom7LiveListeners)for(var o=0;o<this[n].dom7LiveListeners.length;o++)this[n].dom7LiveListeners[o].listener===t&&this[n].removeEventListener(i[s],this[n].dom7LiveListeners[o].liveListener,r);return this},once:function(e,a,t,r){function i(n){t(n),s.off(e,a,i,r)}var s=this;"function"==typeof a&&(a=!1,t=arguments[1],r=arguments[2]),s.on(e,a,i,r)},trigger:function(e,a){for(var t=0;t<this.length;t++){var r;try{r=new window.CustomEvent(e,{detail:a,bubbles:!0,cancelable:!0})}catch(i){r=document.createEvent("Event"),r.initEvent(e,!0,!0),r.detail=a}this[t].dispatchEvent(r)}return this},transitionEnd:function(e){function a(s){if(s.target===this)for(e.call(this,s),t=0;t<r.length;t++)i.off(r[t],a)}var t,r=["webkitTransitionEnd","transitionend","oTransitionEnd","MSTransitionEnd","msTransitionEnd"],i=this;if(e)for(t=0;t<r.length;t++)i.on(r[t],a);return this},width:function(){return this[0]===window?window.innerWidth:this.length>0?parseFloat(this.css("width")):null},outerWidth:function(e){return this.length>0?e?this[0].offsetWidth+parseFloat(this.css("margin-right"))+parseFloat(this.css("margin-left")):this[0].offsetWidth:null},height:function(){return this[0]===window?window.innerHeight:this.length>0?parseFloat(this.css("height")):null},outerHeight:function(e){return this.length>0?e?this[0].offsetHeight+parseFloat(this.css("margin-top"))+parseFloat(this.css("margin-bottom")):this[0].offsetHeight:null},offset:function(){if(this.length>0){var e=this[0],a=e.getBoundingClientRect(),t=document.body,r=e.clientTop||t.clientTop||0,i=e.clientLeft||t.clientLeft||0,s=window.pageYOffset||e.scrollTop,n=window.pageXOffset||e.scrollLeft;return{top:a.top+s-r,left:a.left+n-i}}return null},css:function(e,a){var t;if(1===arguments.length){if("string"!=typeof e){for(t=0;t<this.length;t++)for(var r in e)this[t].style[r]=e[r];return this}if(this[0])return window.getComputedStyle(this[0],null).getPropertyValue(e)}if(2===arguments.length&&"string"==typeof e){for(t=0;t<this.length;t++)this[t].style[e]=a;return this}return this},each:function(e){for(var a=0;a<this.length;a++)e.call(this[a],a,this[a]);return this},html:function(e){if("undefined"==typeof e)return this[0]?this[0].innerHTML:void 0;for(var a=0;a<this.length;a++)this[a].innerHTML=e;return this},text:function(e){if("undefined"==typeof e)return this[0]?this[0].textContent.trim():null;for(var a=0;a<this.length;a++)this[a].textContent=e;return this},is:function(t){if(!this[0])return!1;var r,i;if("string"==typeof t){var s=this[0];if(s===document)return t===document;if(s===window)return t===window;if(s.matches)return s.matches(t);if(s.webkitMatchesSelector)return s.webkitMatchesSelector(t);if(s.mozMatchesSelector)return s.mozMatchesSelector(t);if(s.msMatchesSelector)return s.msMatchesSelector(t);for(r=a(t),i=0;i<r.length;i++)if(r[i]===this[0])return!0;return!1}if(t===document)return this[0]===document;if(t===window)return this[0]===window;if(t.nodeType||t instanceof e){for(r=t.nodeType?[t]:t,i=0;i<r.length;i++)if(r[i]===this[0])return!0;return!1}return!1},index:function(){if(this[0]){for(var e=this[0],a=0;null!==(e=e.previousSibling);)1===e.nodeType&&a++;return a}},eq:function(a){if("undefined"==typeof a)return this;var t,r=this.length;return a>r-1?new e([]):0>a?(t=r+a,new e(0>t?[]:[this[t]])):new e([this[a]])},append:function(a){var t,r;for(t=0;t<this.length;t++)if("string"==typeof a){var i=document.createElement("div");for(i.innerHTML=a;i.firstChild;)this[t].appendChild(i.firstChild)}else if(a instanceof e)for(r=0;r<a.length;r++)this[t].appendChild(a[r]);else this[t].appendChild(a);return this},prepend:function(a){var t,r;for(t=0;t<this.length;t++)if("string"==typeof a){var i=document.createElement("div");for(i.innerHTML=a,r=i.childNodes.length-1;r>=0;r--)this[t].insertBefore(i.childNodes[r],this[t].childNodes[0])}else if(a instanceof e)for(r=0;r<a.length;r++)this[t].insertBefore(a[r],this[t].childNodes[0]);else this[t].insertBefore(a,this[t].childNodes[0]);return this},insertBefore:function(e){for(var t=a(e),r=0;r<this.length;r++)if(1===t.length)t[0].parentNode.insertBefore(this[r],t[0]);else if(t.length>1)for(var i=0;i<t.length;i++)t[i].parentNode.insertBefore(this[r].cloneNode(!0),t[i])},insertAfter:function(e){for(var t=a(e),r=0;r<this.length;r++)if(1===t.length)t[0].parentNode.insertBefore(this[r],t[0].nextSibling);else if(t.length>1)for(var i=0;i<t.length;i++)t[i].parentNode.insertBefore(this[r].cloneNode(!0),t[i].nextSibling)},next:function(t){return new e(this.length>0?t?this[0].nextElementSibling&&a(this[0].nextElementSibling).is(t)?[this[0].nextElementSibling]:[]:this[0].nextElementSibling?[this[0].nextElementSibling]:[]:[])},nextAll:function(t){var r=[],i=this[0];if(!i)return new e([]);for(;i.nextElementSibling;){var s=i.nextElementSibling;t?a(s).is(t)&&r.push(s):r.push(s),i=s}return new e(r)},prev:function(t){return new e(this.length>0?t?this[0].previousElementSibling&&a(this[0].previousElementSibling).is(t)?[this[0].previousElementSibling]:[]:this[0].previousElementSibling?[this[0].previousElementSibling]:[]:[])},prevAll:function(t){var r=[],i=this[0];if(!i)return new e([]);for(;i.previousElementSibling;){var s=i.previousElementSibling;t?a(s).is(t)&&r.push(s):r.push(s),i=s}return new e(r)},parent:function(e){for(var t=[],r=0;r<this.length;r++)e?a(this[r].parentNode).is(e)&&t.push(this[r].parentNode):t.push(this[r].parentNode);return a(a.unique(t))},parents:function(e){for(var t=[],r=0;r<this.length;r++)for(var i=this[r].parentNode;i;)e?a(i).is(e)&&t.push(i):t.push(i),i=i.parentNode;return a(a.unique(t))},find:function(a){for(var t=[],r=0;r<this.length;r++)for(var i=this[r].querySelectorAll(a),s=0;s<i.length;s++)t.push(i[s]);return new e(t)},children:function(t){for(var r=[],i=0;i<this.length;i++)for(var s=this[i].childNodes,n=0;n<s.length;n++)t?1===s[n].nodeType&&a(s[n]).is(t)&&r.push(s[n]):1===s[n].nodeType&&r.push(s[n]);return new e(a.unique(r))},remove:function(){for(var e=0;e<this.length;e++)this[e].parentNode&&this[e].parentNode.removeChild(this[e]);return this},add:function(){var e,t,r=this;for(e=0;e<arguments.length;e++){var i=a(arguments[e]);for(t=0;t<i.length;t++)r[r.length]=i[t],r.length++}return r}},a.fn=e.prototype,a.unique=function(e){for(var a=[],t=0;t<e.length;t++)-1===a.indexOf(e[t])&&a.push(e[t]);return a},a}()),i=["jQuery","Zepto","Dom7"],s=0;s<i.length;s++)window[i[s]]&&e(window[i[s]]);var n;n="undefined"==typeof r?window.Dom7||window.Zepto||window.jQuery:r,n&&("transitionEnd"in n.fn||(n.fn.transitionEnd=function(e){function a(s){if(s.target===this)for(e.call(this,s),t=0;t<r.length;t++)i.off(r[t],a)}var t,r=["webkitTransitionEnd","transitionend","oTransitionEnd","MSTransitionEnd","msTransitionEnd"],i=this;if(e)for(t=0;t<r.length;t++)i.on(r[t],a);return this}),"transform"in n.fn||(n.fn.transform=function(e){for(var a=0;a<this.length;a++){var t=this[a].style;t.webkitTransform=t.MsTransform=t.msTransform=t.MozTransform=t.OTransform=t.transform=e}return this}),"transition"in n.fn||(n.fn.transition=function(e){"string"!=typeof e&&(e+="ms");for(var a=0;a<this.length;a++){var t=this[a].style;t.webkitTransitionDuration=t.MsTransitionDuration=t.msTransitionDuration=t.MozTransitionDuration=t.OTransitionDuration=t.transitionDuration=e}return this})),window.Swiper=t}(),"undefined"!=typeof module?module.exports=window.Swiper:"function"==typeof define&&define.amd&&define([],function(){"use strict";return window.Swiper});
//# sourceMappingURL=maps/swiper.min.js.map

/**
 * @file 图片轮播手指跟随插件
 * @import slider.js
 */
;(function() {
    
    var isScrolling,
        touchesStart,
        touchesEnd,
        delta,
        moved;

        var sliderTonClick = function() {
                return !moved;
            };
        var angle = function(start,end){
                var diff_x = end.x - start.x,
                    diff_y = end.y - start.y;
                //返回角度,不是弧度
                return 360*Math.atan(diff_y/diff_x)/(2*Math.PI);
        }

        var sliderTonStart = function( e ) {
                    
                // 不处理多指
                if ( e.touches.length > 1 ) {
                    return false;
                }

                var _sl = this,
                    touche = e.touches[ 0 ],
                    opts = _sl.opts,
                    num;

                touchesStart = {
                    x: touche.pageX,
                    y: touche.pageY,
                    time: +new Date()
                };

                delta = {};
                moved = false;
                isScrolling = undefined;

                num = opts.mulViewNum || 1;
                _sl.move( opts.loop ? _sl.circle( _sl.index - num ) :
                        _sl.index - num, -_sl.width, 0, true );
                _sl.move( opts.loop ? _sl.circle( _sl.index + num ) :
                        _sl.index + num, _sl.width, 0, true );

                _sl.ref.on( 'touchmove' + ' touchend' +
                        ' touchcancel', _sl._touchHandler );
            };


        var sliderTonMove = function( e ) {
                // 多指或缩放不处理
                if ( e.touches.length > 1 || e.scale &&
                        e.scale !== 1 ) {
                    return false;
                }

                var _sl = this,
                    opts = _sl.opts,
                    viewNum = opts.mulViewNum || 1,
                    touche = e.touches[ 0 ],
                    index = _sl.index,
                    i,
                    len,
                    pos,
                    slidePos;

                opts.disableScroll && e.preventDefault();
                touchesEnd = {
                    x: touche.pageX,
                    y: touche.pageY
                }
                if(Math.abs(angle(touchesStart,touchesEnd)) > 30)return;
                
                d6.verticalSwipe = false;
                delta.x = touche.pageX - touchesStart.x;
                delta.y = touche.pageY - touchesStart.y;
                if ( typeof isScrolling === 'undefined' ) {
                    isScrolling = Math.abs( delta.x ) <
                            Math.abs( delta.y );
                }

                if ( !isScrolling ) {
                    e.preventDefault();

                    if ( !opts.loop ) {

                        // 如果左边已经到头
                        delta.x /= (!index && delta.x > 0 ||

                                // 如果右边到头
                                index === _sl._items.length - 1 && 
                                delta.x < 0) ?

                                // 则来一定的减速
                                (Math.abs( delta.x ) / _sl.width + 1) : 1;
                    }

                    slidePos = _sl._slidePos;

                    for ( i = index - viewNum, len = index + 2 * viewNum;
                            i < len; i++ ) {
                        pos = opts.loop ? _sl.circle( i ) : i;
                        _sl.translate( pos, delta.x + slidePos[ pos ], 0 );
                    }

                    moved = true;
                }
            };

        var sliderTonEnd = function() {
                d6.verticalSwipe = true;
                var _sl = this,
                    opts = _sl.opts;
                // 解除事件
                _sl.ref.off( 'touchmove' + ' touchend' + ' touchcancel',
                        _sl._touchHandler );

                if ( !moved ) {
                    return;
                }

                var viewNum = opts.mulViewNum || 1,
                    index = _sl.index,
                    slidePos = _sl._slidePos,
                    duration = +new Date() - touchesStart.time,
                    absDeltaX = Math.abs( delta.x ),

                    // 是否滑出边界
                    isPastBounds = !opts.loop && (!index && delta.x > 0 ||
                        index === slidePos.length - viewNum && delta.x < 0),

                    // -1 向右 1 向左
                    dir = delta.x > 0 ? 1 : -1,
                    speed,
                    diff,
                    i,
                    len,
                    pos;

                if ( duration < 250 ) {

                    // 如果滑动速度比较快，偏移量跟根据速度来算
                    speed = absDeltaX / duration;
                    diff = Math.min( Math.round( speed * viewNum * 1.2 ),
                            viewNum );
                } else {
                    diff = Math.round( absDeltaX / (_sl.perWidth || _sl.width) );
                }
                
                if ( diff && !isPastBounds ) {
                    _sl.slide( index, diff, dir, _sl.width, opts.speed,
                            opts, true );
                    
                    // 在以下情况，需要多移动一张
                    if ( viewNum > 1 && duration >= 250 &&
                            Math.ceil( absDeltaX / _sl.perWidth ) !== diff ) {

                        _sl.index < index ? _sl.move( _sl.index - 1, -_sl.perWidth,
                                opts.speed ) : _sl.move( _sl.index + viewNum,
                                _sl.width, opts.speed );
                    }
                } else {
                    if((_sl.index == 0 && dir == 1) || (_sl.index == (_sl.length - 1) && dir == -1)){//左右滑到尽头
                        (!opts.loop) && _sl.ref.trigger('moveend', [_sl.index,dir]);
                    }
                    // 滑回去
                    for ( i = index - viewNum, len = index + 2 * viewNum;
                        i < len; i++ ) {

                        pos = opts.loop ? _sl.circle( i ) : i;
                        _sl.translate( pos, slidePos[ pos ], 
                                opts.speed );
                    }
                }
        };

    

    /**
     * 图片轮播手指跟随插件
     * @pluginfor Slider
     */
    define(function($ui) {
       
        $ui.plugin('sTouch', function() {
                var _sl = this, opts = _sl.opts;

                 // 提供默认options
                $.extend(true, opts, {

                    /**
                     * @property {Boolean} [stopPropagation=false] 是否阻止事件冒泡
                     * @namespace options
                     * @for Slider
                     * @uses Slider.touch
                     */
                    stopPropagation: false,

                    /**
                     * @property {Boolean} [disableScroll=false] 是否阻止滚动
                     * @namespace options
                     * @for Slider
                     * @uses Slider.touch
                     */
                    disableScroll: false
                });

                _sl._touchHandler = function( e ) {
                    opts.stopPropagation && e.stopPropagation();
                    switch (e.type) {
                        case 'touchstart':
                            sliderTonStart.call(_sl,e);
                            break;
                        case 'touchmove':
                            sliderTonMove.call(_sl,e);
                            break;
                        case 'touchcancel':
                        case 'touchend':
                            sliderTonEnd.call(_sl,e);
                            break;
                        case 'click':
                            sliderTonClick.call(_sl,e);
                            break;
                    }
                };
                // 绑定手势
                _sl.ref.on( 'touchstart', _sl._touchHandler);
                    
            });
    } );
})()
/**
 * @file 图片轮播剪头按钮
 */
;(function() {
    

    /**
     * 图片轮播剪头按钮
     */
    define(function($ui) {
        $ui.plugin('sGuide', function(){
            var _sl = this, opts = _sl.opts,
                arr = [ 'prev', 'next' ];

             $.extend(true, opts, {
                    tpl: {
                        prev: '<span class="ui-slider-pre"></span>',
                        next: '<span class="ui-slider-next"></span>'
                    },

                    /**
                     * @property {Object} [select={prev:'.ui-slider-pre',next:'.ui-slider-next'}] 上一张和下一张按钮的选择器
                     * @namespace options
                     * @for Slider
                     * @uses Slider.arrow
                     */
                    selector: {
                        prev: '.ui-slider-pre',    // 上一张按钮选择器
                        next: '.ui-slider-next'    // 下一张按钮选择器
                    }
                });

            

                var selector = opts.selector;

                arr.forEach(function( name ) {
                    var item = _sl.ref.find( selector[ name ] );
                    item.length || _sl.ref.append( item = $( opts.tpl[name]));
                    _sl[ '_' + name ] = item;
                });

                arr.forEach(function( name ) {
                    _sl[ '_' + name ].on( _sl.touchEve, function() {
                        _sl[ name ].call( _sl );
                    } );
                });

                _sl.ref.on( 'destroy', function() {
                    _sl._prev.off();
                    _sl._next.off();
                } );
        });
    });
})()
/**
 * 图片轮播多图显示功能
 */
;(function() {
     /**
     * 图片轮播多图显示功能
     */
    define(function($ui) {
        $ui.plugin('sMultiview', function(){
            var _sl = this, opts = _sl.opts;

            _sl.arrange = function() {
                var items = _sl._items,
                    viewNum = opts.mulViewNum,
                    factor = _sl.index % viewNum,
                    i = 0,
                    perWidth = _sl.perWidth = Math.ceil( _sl.width / viewNum ),
                    item,
                    len;

                _sl._slidePos = new Array( items.length );

                for ( len = items.length; i < len; i++ ) {
                    item = items[ i ];

                    item.style.cssText += 'width:' + perWidth + 'px;' +
                            'left:' + (i * -perWidth) + 'px;';
                    item.setAttribute( 'data-index', i );

                    i % viewNum === factor && _sl.move( i,
                            i < _sl.index ? -_sl.width : i > _sl.index ? _sl.width : 0,
                            0, Math.min( viewNum, len - i ) );
                }

                _sl._container.css( 'width', perWidth * len );
            };

            _sl.move = function( index, dist, speed, immediate, count ) {
                var _sl = this, opts = _sl.opts,
                    perWidth = _sl.perWidth,
                    i = 0;

                count = count || opts.mulViewNum;

                for ( ; i < count; i++ ) {
                    _sl.move(opts.loop ? _sl.circle( index + i ) :
                            index + i, dist + i * perWidth, speed, immediate );
                }
            };

            _sl.slide = function( from, diff, dir, width, speed, opts, mode ) {
                var _sl = this, opts = _sl.opts,
                    viewNum = opts.mulViewNum,
                    len = this._items.length,
                    offset,
                    to;

                // 当不是loop时，diff不能大于实际能移动的范围
                opts.loop || (diff = Math.min( diff, dir > 0 ?
                                from : len - viewNum - from ));

                to = _sl.circle( from - dir * diff );

                // 如果不是loop模式，以实际位置的方向为准
                opts.loop || (dir = Math.abs( from - to ) / (from - to));

                diff %= len;    // 处理diff大于len的情况

                // 相反的距离比viewNum小，不能完成流畅的滚动。
                if ( len - diff < viewNum ) {
                    diff = len - diff;
                    dir = -1 * dir;
                }

                offset = Math.max( 0, viewNum - diff );

                // 调整初始位置，如果已经在位置上不会重复处理
                // touchend中执行过来的，不会执行以下代码
                if ( !mode ) {
                    _sl.move( to, -dir * this.perWidth *
                            Math.min( diff, viewNum ), 0, true );
                    _sl.move( from + offset * dir, offset * dir *
                            this.perWidth, 0, true );
                }

                _sl.move( from + offset * dir, width * dir, speed );
                _sl.move( to, 0, speed );

                _sl.index = to;
                _sl.ref.trigger('slide', [to,from]);
                return _sl;
            };

            _sl.prev = function() {
                var _sl = this, to, opts = _sl.opts;
                    travelSize = opts.travelSize;

                if ( opts.loop || (_sl.index > 0, travelSize =
                        Math.min( _sl.index, travelSize )) ) {

                    _sl.slideTo( _sl.index - travelSize );
                }

                return _sl;
            };

            _sl.next = function() {
                var _sl = this, opts = _sl.opts;
                    travelSize = opts.travelSize,
                    viewNum = opts.mulViewNum;

                if ( opts.loop || (_sl.index + viewNum < _sl.length &&
                        (travelSize = Math.min( _sl.length - 1 - _sl.index,
                        travelSize ))) ) {

                    _sl.slideTo( _sl.index + travelSize );
                }

                return _sl;
            };
        });
    });
})()
/**
 * @file 图片轮播手指缩放插件
 */
;(function() {
    var bWidth,
        bHeight,
        bScrollLeft,
        bScrollTop,
        target,
        targetImg;


    var gesturestart = function(e) {
        var _gt = this;
        target = _gt._items[_gt.index];
        targetImg = $(target).find('.ui-slider-img');
        bWidth = targetImg.width();
        bHeight = targetImg.height();
        bScrollLeft = $(target).scrollLeft();
        bScrollTop = $(target).scrollTop();
        var scale = e.scale;
        _gt.ref.on('gesturechange ' + ' gestureend', _gt._gestureHandler);
    };


    var gesturechange = function(e) {
        // 多指或缩放不处理
        var _gt = this,
            opts = _gt.opts,
            scale = e.scale;
        $(target).css('overflow', 'hidden');
        if (1 < scale && scale < 2) {
            target.isMax = true;
            var ratio = scale - 1;
            var mWidth = bWidth + opts.MaxWidthPx * ratio;
            var mHeight = targetImg[0].sHeight / targetImg[0].sWidth * mWidth;
            if ((mWidth) < (targetImg[0].sWidth + opts.MaxWidthPx)) {
                targetImg.css('width', mWidth)
                target.scrollLeft = bScrollLeft + (mWidth - bWidth) / 2
                targetImg.css('height', mHeight)
                target.scrollTop = bScrollTop + (mHeight - bHeight) / 2
            } else {
                targetImg.css('width', targetImg[0].sWidth + opts.MaxWidthPx);
                target.scrollLeft = bScrollLeft + (targetImg[0].sWidth + opts.MaxWidthPx - bWidth) / 2;
                targetImg.css('height', (targetImg[0].sHeight / targetImg[0].sWidth) * (targetImg[0].sWidth + opts.MaxWidthPx))
                target.scrollTop = bScrollTop + ((targetImg[0].sHeight / targetImg[0].sWidth) * (targetImg[0].sWidth + opts.MaxWidthPx) - bHeight) / 2
            }
            _gt.ref.off('touchstart ' + 'touchmove' + ' touchend' + ' touchcancel',
                _gt._touchHandler);
        } else if (scale < 1) {
            var ratio = 1 - scale;
            var mWidth = bWidth - opts.MaxWidthPx * ratio;
            var mHeight = targetImg[0].sHeight / targetImg[0].sWidth * mWidth;

            if (mWidth > (targetImg[0].sWidth)) {
                targetImg.css('width', mWidth)
                target.scrollLeft = (bScrollLeft - (bWidth - mWidth) / 2) > 0 ? bScrollLeft - (bWidth - mWidth) / 2 : 0
                targetImg.css('height', mHeight)
                target.scrollTop = (bScrollTop - (bHeight - mHeight) / 2) > 0 ? bScrollTop - (bHeight - mHeight) / 2 : 0
                    // _gt.ref.find('.ui-slider-dots').html(target.scrollLeft + "  " + target.scrollTop)
            } else {
                target.isMax = false;
                targetImg.css('width', targetImg[0].sWidth)
                targetImg.css('height', targetImg[0].sHeight)
                target.scrollLeft = 0;
                target.scrollTop = 0;
                $(target).css('overflow', 'hidden');
                _gt.ref.on('touchstart', _gt._touchHandler);
            }

        }

    };

    var gestureend = function() {
        var _gt = this,
            opts = _gt.opts;
        if (target.isMax) $(target).css('overflow', 'scroll');
        // 解除事件
        _gt.ref.off('gesturechange ' + 'gestureend',
            _gt._gestureHandler);


    };



    /**
     * 图片轮播手指跟随插件
     * @pluginfor Slider
     */
    define(function($ui) {

        $ui.plugin('sGestures', function() {
            var _gt = this,
                opts = _gt.opts;

            // 提供默认options
            $.extend(true, opts, {

                /**
                 * @property 宽度放大的最大PX值
                 * @namespace options
                 * @for Slider
                 * @uses 
                 */
                MaxWidthPx: 500
            });

            _gt._gestureHandler = function(e) {
                opts.stopPropagation && e.stopPropagation();
                switch (e.type) {
                    case 'gesturestart':
                        gesturestart.call(_gt, e);
                        break;
                    case 'gesturechange':
                        gesturechange.call(_gt, e);
                        break;
                    case 'gestureend':
                        gestureend.call(_gt, e);
                        break;
                }
            };
            // 绑定手势
            _gt.ref.on('gesturestart', _gt._gestureHandler);

            $.each(_gt._items, function(i, item) {
                var img = $(item).find('.ui-slider-img');
                img[0].sWidth = img.width();
                img.css('transform', 'translate3d(0, 0, 0)');
                img[0].sHeight = img.height();
            });

            _gt.ref.find('.ui-slider-img').on('doubleTap', function(e) {
                target = _gt._items[_gt.index];
                targetImg = $(target).find('.ui-slider-img');
                bWidth = targetImg.width();
                bHeight = targetImg.height();
                if (!target.isMax) {
                    target.isMax = true;
                    $(target).css('overflow', 'scroll');
                    targetImg.css('width', targetImg[0].sWidth + opts.MaxWidthPx);
                    target.scrollLeft = target.scrollLeft + (targetImg[0].sWidth + opts.MaxWidthPx - bWidth) / 2;
                    targetImg.css('height', (targetImg[0].sHeight / targetImg[0].sWidth) * (targetImg[0].sWidth + opts.MaxWidthPx))
                    target.scrollTop = target.scrollTop + ((targetImg[0].sHeight / targetImg[0].sWidth) * (targetImg[0].sWidth + opts.MaxWidthPx) - bHeight) / 2

                    _gt.ref.off('touchstart ' + 'touchmove' + ' touchend' + ' touchcancel',
                        _gt._touchHandler);
                } else {
                    target.isMax = false;
                    targetImg.css('width', targetImg[0].sWidth)
                    targetImg.css('height', targetImg[0].sHeight)
                    target.scrollLeft = 0;
                    target.scrollTop = 0;
                    $(target).css('overflow', 'hidden');
                    _gt.ref.on('touchstart', _gt._touchHandler);
                }
            });

        });
    });
})()
/**
 * @file refresh 组件
 */
;
(function() {

    var CLASS_PULL_TOP_POCKET = 'ui-pull-top-pocket';
    var CLASS_PULL_BOTTOM_POCKET = 'ui-pull-bottom-pocket';
    var CLASS_PULL = 'ui-pull';
    var CLASS_PULL_LOADING = 'ui-pull-loading';
    var CLASS_PULL_CAPTION = 'ui-pull-caption';

    var CLASS_ICON = 'ui-icon';
    var CLASS_SPINNER = 'fa fa-spinner fa-pulse';
    var CLASS_ICON_PULLDOWN = 'ui-icon-pulldown';

    var CLASS_BLOCK = 'ui-block';
    var CLASS_HIDDEN = 'ui-hidden';

    var CLASS_SCROLL = 'ui-scroll';
    var CLASS_SCROLL_WRAPPER = 'ui-scroll-wrapper';

    var CLASS_LOADING_UP = CLASS_PULL_LOADING + ' ' + CLASS_ICON + ' ' + CLASS_ICON_PULLDOWN;
    var CLASS_LOADING_DOWN = CLASS_PULL_LOADING + ' ' + CLASS_ICON + ' ' + CLASS_ICON_PULLDOWN;
    var CLASS_LOADING = CLASS_PULL_LOADING + ' ' + CLASS_ICON + ' ' + CLASS_SPINNER;

    var pocketHtml = ['<div class="' + CLASS_PULL + '">', '<div class="{icon}"></div>', '<div class="' + CLASS_PULL_CAPTION + '">{contentrefresh}</div>', '</div>'].join('');


    var render = function() {
        var _re = this,
            opts = _re.opts;
        _re.wrapper = _re.ref;
        _re.scrollEl = _re.wrapper.children().first();
        if (opts.down) {
            _re.topPocket = _re.scrollEl.find('.' + CLASS_PULL_TOP_POCKET);
            if (!_re.topPocket[0]) {
                _re.topPocket = createPocket(CLASS_PULL_TOP_POCKET, opts.down.contentrefresh, CLASS_LOADING_DOWN);
                _re.topPocket.insertBefore(_re.scrollEl);
            }
            _re.topLoading = _re.topPocket.find('.' + CLASS_PULL_LOADING);
            _re.topCaption = _re.topPocket.find('.' + CLASS_PULL_CAPTION);
        }
        if (opts.up && opts.enablePullup) {
            _re.bottomPocket = _re.scrollEl.find('.' + CLASS_PULL_BOTTOM_POCKET);
            if (!_re.bottomPocket[0]) {
                _re.bottomPocket = createPocket(CLASS_PULL_BOTTOM_POCKET, opts.up.contentdown, CLASS_LOADING);
                _re.bottomPocket.appendTo(_re.scrollEl);
                _re.bottomPocket.addClass(CLASS_BLOCK);
                _re.bottomPocket.css('visibility', 'visible');
                // _re.initPullup = true;
            }
            _re.bottomLoading = _re.bottomPocket.find('.' + CLASS_PULL_LOADING);
            _re.bottomCaption = _re.bottomPocket.find('.' + CLASS_PULL_CAPTION);
        }
    };
    var angle = function(start, end) {
        var diff_x = end.x - start.x,
            diff_y = end.y - start.y;
        //返回角度,不是弧度
        return 360 * Math.atan(diff_y / diff_x) / (2 * Math.PI);
    }

    var disableScroll = function() {
        d6.verticalSwipe = false
    };

    var enableScroll = function() {
        d6.verticalSwipe = true
    };

    var bind = function() {
        var _re = this,
            opts = _re.opts,
            touchesStart, touchesEnd;

        _re.scroller.on('scrollStart', function() {
            touchesStart = {
                x: this.pointX,
                y: this.pointY
            };
            if (!_re.loading) {
                _re.pulldown = _re.pullup = _re.pullPocket = _re.pullCaption = _re.pullLoading = false
            }
        });
        _re.scroller.on('scroll', function(e) {
            touchesEnd = {
                x: this.pointX,
                y: this.pointY
            }
            if (!(opts.enablePullup || opts.enablePulldown)) {
                disableScroll();
            } else if (!opts.enablePullup) {
                if (this.distY < 0) {
                    disableScroll();
                } else {
                    enableScroll();
                }
            } else if (!opts.enablePulldown) {
                if (this.distY > 0) {
                    disableScroll();
                } else {
                    enableScroll();
                }
            }
            // console.log(angle(touchesEnd,touchesStart));
            // if(Math.abs(angle(touchesEnd,touchesStart)) < 30)return;
            if (!_re.pulldown && !_re.loading && _re.topPocket && this.directionY === -1 && this.y >= 0) {
                initPulldownRefresh.call(_re);
            }
            if (!_re.pullup && !_re.finished && !_re.loading && _re.topPocket && this.directionY === 1 && this.y < 0) {
                initPullupRefresh.call(_re);
            }
            if (_re.pulldown) {
                setCaption.call(_re, this.y > opts.down.height ? opts.down.contentover : opts.down.contentdown);
            }

            if (this.maxScrollY == -1) {
                this.maxScrollY = 0 - opts.up.height;
            }
            var disY = this.maxScrollY - this.y
            if (_re.pullup && !_re.finished && disY > 10) {
                _re.autoUpHidden = false;
                setCaption.call(_re, Math.abs(this.y) > opts.up.height ? opts.up.contentover : opts.up.contentdown);
            } else if (disY < 10 && disY > 0 - opts.up.height) {
                if (_re.pullup && !_re.loading && !_re.finished) {
                    !opts.up.display && (_re.autoUpHidden = true)
                }
            }
            if (_re.pulldown && this.y > 0 && this.y < opts.down.height) {
                _re.autoDownHidden = true;
            } else {
                _re.autoDownHidden = false;
            }
        });

        _re.scroller.on('scrollEnd', function(e) {
            if (_re.autoUpHidden) {
                _re.autoUpHidden = false;
                _re.scroller.scrollTo(0, 0, _re.scroller.options.bounceTime, _re.scroller.options.bounceEasing);
            } else if (_re.pulldown && _re.autoDownHidden) {
                _re.autoDownHidden = false;
            }

        });

        var _resetPosition = _re.scroller.resetPosition;
        $.extend(_re.scroller, {
            resetPosition: function(time) {
                if (_re.pulldown && this.y >= opts.down.height) {
                    _re.pulldownLoading();
                    return true;
                }
                if (this.maxScrollY == -1) {
                    this.maxScrollY = 0 - opts.up.height;
                }
                var disY = this.maxScrollY - this.y
                if (_re.pullup && disY > 10 && !_re.loading && !_re.finished) {
                    _re.pullupLoading();
                    return true;
                }
                return _resetPosition.call(_re.scroller, time);
            }
        });

    };

    var initPulldownRefresh = function() {
        var _re = this,
            opts = _re.opts;
        if (!opts.enablePulldown) {
            return;
        }
        _re.pulldown = true;
        _re.pullup = false;
        _re.pullPocket = _re.topPocket;
        _re.pullPocket.addClass(CLASS_BLOCK);
        _re.pullPocket.css('visibility', 'visible');
        _re.pullCaption = _re.topCaption;
        _re.pullLoading = _re.topLoading;
    };
    var initPullupRefresh = function() {
        var _re = this,
            opts = _re.opts;
        if (!opts.enablePullup) {
            return;
        }
        _re.pulldown = false;
        _re.pullup = true;
        _re.pullPocket = _re.bottomPocket;
        _re.pullCaption = _re.bottomCaption;
        _re.pullLoading = _re.bottomLoading;
    };

    var resetPosition = function(scroller) {
        var _re = this,
            opts = _re.opts;
        if (_re.pulldown && scroller.y >= opts.down.height) {
            _re.pulldownLoading();
            return true;
        }
    };

    var createPocket = function(clazz, content, iconClass) {
        var pocket = document.createElement('div');
        pocket.className = clazz;
        pocket.innerHTML = pocketHtml.replace('{contentrefresh}', content).replace('{icon}', iconClass);
        return $(pocket);
    };

    var setCaption = function(title, reset) {
        var _re = this,
            opts = _re.opts;
        if (_re.loading) {
            return;
        }
        var pocket = _re.pullPocket[0];
        var caption = _re.pullCaption[0];
        var loading = _re.pullLoading[0];
        var isPulldown = _re.pulldown;
        if (pocket) {
            if (reset) {
                caption.innerHTML = '';
                loading.className = '';
                loading.style.webkitAnimation = "";
                loading.style.webkitTransition = "";
                loading.style.webkitTransform = "";
            } else {
                if (title !== _re.lastTitle) {
                    caption.innerHTML = title;
                    if (isPulldown) {
                        caption.innerHTML = title;
                        if (title === opts.down.contentrefresh) {
                            loading.className = CLASS_LOADING;
                            loading.style.webkitAnimation = "spinner-spin 1s step-end infinite";
                        } else if (title === opts.down.contentover) {
                            loading.className = CLASS_LOADING_UP;
                            loading.style.webkitTransition = "-webkit-transform 0.3s ease-in";
                            loading.style.webkitTransform = "rotate(180deg)";
                        } else if (title === opts.down.contentdown) {
                            loading.className = CLASS_LOADING_DOWN;
                            loading.style.webkitTransition = "-webkit-transform 0.3s ease-in";
                            loading.style.webkitTransform = "rotate(0deg)";
                        }
                    } else {
                        if (title === opts.up.contentrefresh) {
                            $(loading).css('display', 'inline-block');
                            $(loading).css('visibility', 'visible');
                            if ($.os.android && ($.os.version == '4.3')) {
                                $('html').css('visibility', 'hidden');
                                setTimeout(function() {
                                    $('html').css('visibility', 'visible');
                                }, 80);
                            }
                        } else {
                            loading.style.display = 'none';
                        }
                    }
                    _re.lastTitle = title;
                }
            }

        }
    };

    /**
     * 刷新组件
     */
    define(function($ui) {
        var $refresh = $ui.define('Refresh', {
            down: {
                height: 50,
                contentdown: '下拉可以刷新',
                contentover: '释放立即刷新',
                contentrefresh: '正在刷新...'
            },
            up: {
                height: 40,
                display: true, //下拉加载字段是否始终存在
                contentdown: '上拉显示更多',
                contentover: '释放立即刷新',
                contentrefresh: '正在加载...',
                contentnomore: '没有更多数据了'
            },
            enablePulldown: true,
            enablePullup: true,

        });

        //初始化
        $refresh.prototype.init = function() {
            var _re = this,
                opts = _re.opts;

            _re.ref.addClass(CLASS_SCROLL_WRAPPER);
            _re.ref.children().wrapAll('<div class = "' + CLASS_SCROLL + '"/>');
            _re.scroller = new IScroll(_re.ref[0], {
                scrollY: true,
                scrollX: false,
                bounceTime: 300,
                bounceEasing: 'quadratic',
                probeType: 2, //每滚动一像素触发
                disableMouse: false,
                disablePointer: true
            })
            render.call(_re);
            bind.call(_re);
        };


        $refresh.prototype.pulldownLoading = function() {
            var _re = this,
                opts = _re.opts;
            if (!opts.enablePulldown) {
                return;
            }
            var time = _re.scroller.options.bounceTime;
            _re.scroller.scrollTo(0, opts.down.height, time, IScroll.utils.ease.circular);
            if (_re.loading) {
                return;
            }
            initPulldownRefresh.call(_re);
            setCaption.call(_re, opts.down.contentrefresh);
            _re.loading = true;
            _re.ref.trigger('pulldown', _re);
        };

        $refresh.prototype.pullupLoading = function() {
            var _re = this,
                opts = _re.opts;
            if (!opts.enablePullup) {
                return;
            }
            var time = _re.scroller.options.bounceTime;
            _re.scroller.scrollTo(0, _re.scroller.maxScrollY, time, _re.scroller.options.bounceEasing);
            if (_re.loading) {
                return;
            }
            initPullupRefresh.call(_re);
            setCaption.call(_re, opts.up.contentrefresh);
            _re.loading = true;
            _re.ref.trigger('pullup', _re);
        };



        $refresh.prototype.endPulldownToRefresh = function() {
            var _re = this,
                opts = _re.opts;
            if (_re.topPocket && _re.loading && _re.pulldown) {
                _re.scroller.scrollTo(0, 0, _re.scroller.options.bounceTime, _re.scroller.options.bounceEasing);
                _re.loading = false;
                setCaption.apply(_re, [opts.down.contentdown, true]);
                setTimeout(function() {
                    _re.scroller.refresh();
                    _re.loading || _re.topPocket.css('visibility', 'hidden');
                }, 150);
            }
        };

        $refresh.prototype.endPullupToRefresh = function(finished) {
            var _re = this,
                opts = _re.opts;
            if (!opts.up.display) _re.scroller.scrollTo(0, 0, _re.scroller.options.bounceTime, _re.scroller.options.bounceEasing);
            if (_re.bottomPocket && _re.loading && !_re.pulldown) {
                _re.loading = false;
                if (finished) {
                    _re.finished = true;
                    setCaption.call(_re, opts.up.contentnomore);
                    _re.scroller.refresh();
                } else {
                    setCaption.call(_re, opts.up.contentdown);
                    setTimeout(function() {
                        _re.scroller.refresh();
                    }, 150);
                }
            }
        };

        $refresh.prototype.disablePulldown = function() {
            var _re = this,
                opts = _re.opts;
            opts.enablePulldown = false;
        };

        $refresh.prototype.disablePullup = function() {
            var _re = this,
                opts = _re.opts;
            opts.enablePullup = false;
        };

        $refresh.prototype.enablePulldown = function() {
            var _re = this,
                opts = _re.opts;
            opts.enablePulldown = true;
        };

        $refresh.prototype.enablePullup = function() {
            var _re = this,
                opts = _re.opts;
            opts.enablePullup = true;
        };


        /**
         * 销毁组件
         * @method destroy
         */
        $refresh.prototype.destroy = function() {

        };
        //注册$插件
        $.fn.refresh = function(opts) {
            var refObjs = [];
            opts || (opts = {});
            this.each(function() {
                var refObj = null;
                var id = this.getAttribute('data-ref');
                if (!id) {
                    opts = $.extend(opts, {
                        ref: this
                    });
                    id = ++$ui.uuid;
                    refObj = $ui.data[id] = new $refresh(opts);
                    this.setAttribute('data-ref', id);
                } else {
                    refObj = $ui.data[id];
                }
                refObjs.push(refObj);
            });
            return refObjs.length > 1 ? refObjs : refObjs[0];
        };

    });
})();
+(function($) {
    'use strict';
    /*
        time:2016-07-15
        author:maweichao
        desc:手风琴
     */
    //方法
    var methods = {

    };

    //定义构造  
    var Collapse = function(ele, opt) {
        this.$ele = $(ele);

        this.options = $.extend({}, Collapse.defaults, opt);
        //获取触发元素有时候是空
        this.$trigger = $('[data-toggle="collapse"][href="#' + ele.id + '"],' + '[data-toggle="collapse"][data-target="#' + ele.id + '"]')
        this.transitioning = null
            //如果选项里边设置了parent就设置直接调否者初始化元素样式
        if (this.options.parent) {
            this.$parent = this.getParent()
        } else {
            this.addAriaAndCollapsedClass(this.$ele, this.$trigger)
        }
        if (this.options.toggle) this.toggle()
    };

    //版本号
    Collapse.v = '3.3.6';
    Collapse.defaults = {
        toggle: false
    };
    Collapse.prototype.toggle = function() {
        //通过内容类样式判断是否隐藏
        this[this.$ele.hasClass('active') ? 'hide' : 'show']();
    };
    Collapse.prototype.show = function() {
        if (this.transitioning || this.$ele.hasClass('active')) return
            //var actives = this.$parent && this.$parent.children(".ui-accordion-li-content")
            // debugger;
        var startEvent = $.Event('show:collapse')
        this.$ele.trigger(startEvent)
        if (startEvent.isDefaultPrevented()) return

        this.$trigger.addClass("ui-accordion-li-link-active");
        this.$ele.addClass("active");
        /* function complete() {
            this.$trigger.addClass("ui-accordion-li-link-active");
            this.$ele.addClass("active").trigger('show:collapse');
        }
         if(!$.support.transition) return complete.call(this);*/
    };

    Collapse.prototype.hide = function() {
        if (this.transitioning || !this.$ele.hasClass('active')) return
        var startEvent = $.Event('hide:collapse')
        this.$ele.trigger(startEvent);
        if (startEvent.isDefaultPrevented()) return
        this.$trigger.removeClass("ui-accordion-li-link-active");
        this.$ele.removeClass("active");

    };
    
    Collapse.prototype.addAriaAndCollapsedClass = function($ele, $trigger) {
        //根据内容统一触发元素口径
        var isOpen = $ele.hasClass("active")
        $ele.attr('status', isOpen)
        $trigger.toggleClass('ui-accordion-li-link-active', !isOpen).attr('status', isOpen)
    };

    Collapse.prototype.getParent = function() {
        //获取父亲元素

    };
    
    function Plugin(option) {
        this.each(function() {
            var $this = $(this)
            var data = $this.data('dt.collapse');
            var options = $.extend({}, Collapse.defaults, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('dt.collapse', (data = new Collapse(this, options))) }
            if (typeof option == 'string') data[option]()
        });
    };

    // 将原先的button插件对象赋值给一个临时变量old  
    var oldplug = $.fn.collapse;

    $.fn.collapse = Plugin;

    //手动暴漏collapse构造以便外部使用
    $.fn.collapse.Constructor = Collapse;

    // 执行该函数，恢复原先的collapse定义，并返回之前定义的collapse插件  
    $.fn.collapse.noConflict = function() {
        $.fn.Collapse = oldplug;
        return this;
    };

       
    //绑定事件
    $(document)
        .on('tap.dt.collapse.data-api', '[data-toggle="collapse"]', function(e) {
            /*    if (e.preventDefault) {
                    e.preventDefault();
                } else {
                    e.returnValue = false;
                }*/
            var $this = $(this)
            if (!$this.attr('data-target')) e.preventDefault
            var $target = getTargetFormTrigger($this)
            var data = $target.data('dt.collapse')
            var option = data ? 'toggle' : $this.data()
            Plugin.call($target, option)
        })

        
    function getTargetFormTrigger($trigger) {
        //此处是根据触发元素的属性获取内容区域的id并且返回内容容器对象
        var href
        var target = $trigger.attr('data-target') || (href = $trigger.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')
        return $(target)
    }
})($);

/**
 * @file 选项卡组件
 */

;(function() {

    // 私有变量  
    var CLASS_TAB_BAR = 'ui-tab-bar',
        CLASS_TAB_ITEM = 'ui-tab-item',
        CLASS_ACTIVE = 'ui-active',
        CLASS_CONTROL_CONTENT = 'ui-control-content';

    var SELECTOR_ACTIVE = '.' + CLASS_ACTIVE;





// 私有方法  

// 渲染组件
    var render = function() {
        var _tb = this,
            opts = _tb.opts;
        opts.items = _tb.ref.children();
        opts.active = Math.max(0, Math.min(opts.items.length - 1, opts.active || $(SELECTOR_ACTIVE, _tb.ref).index() || 0));
        opts.items.eq(opts.active).addClass(CLASS_ACTIVE);
        opts.items[opts.active].actived = true;
    };

// 绑定事件 
    var bind = function() {
        var _tb = this,
            opts = _tb.opts;

        _tb.ref.on(_tb.touchEve, function(e) {
            if ((match = $(e.target).closest('a', _tb.ref)) && match.length) {
                e.preventDefault();
                _tb.switchTo(match.index());
            }
        });
    };

    
    /**
     * 选项卡组件
     */
    define(function($ui) {


        // 对象定义  
        var $tabs = $ui.define('Tabs', {

            /**
             * @property {Number} [active=0] 初始时哪个为选中状态
             * @namespace options
             */
            active: 0
        });




// 对象扩展对外接口  


        //初始化
        $tabs.prototype.init = function() {
            render.call(this);
            bind.call(this);
        };
        /**
         * 切换到某个Tab
         * @method switchTo
         * @param {Number} index Tab编号
         * @chainable
         * @return {self} 返回本身。
         */
        $tabs.prototype.switchTo = function(index) {
            var _tb = this,
                opts = _tb.opts,
                items = opts.items,
                eventData, to, from, reverse, endEvent;
            if (opts.active != (index = Math.max(0, Math.min(items.length - 1, index)))) {
                to = index;
                from = opts.active;

                items.removeClass(CLASS_ACTIVE).eq(to).addClass(CLASS_ACTIVE);
                opts.active = index;
                if (!items[opts.active].actived) {
                    $.each(items, function(index, el) {
                        items[index].actived = false;
                    })
                    items[opts.active].actived = true;
                    _tb.ref.trigger('activate', [to, from]);
                }
            }
            return _tb;
        };

        /**
         * 销毁组件
         * @method destroy
         */
        $tabs.prototype.destroy = function() {

        };



        // 绑定到zepto对象上  供外部创建对象使用 

        //注册$插件
        $.fn.tab = function(opts) {
            var tabObjs = [];
            opts || (opts = {});
            this.each(function() {
                var tabObj = null;
                var id = this.getAttribute('data-tab');
                if (!id) {
                    opts = $.extend(opts, {
                        ref: this
                    });
                    id = ++$ui.uuid;
                    tabObj = $ui.data[id] = new $tabs(opts);
                    this.setAttribute('data-tab', id);
                } else {
                    tabObj = $ui.data[id];
                }
                tabObjs.push(tabObj);
            });
            return tabObjs.length > 1 ? tabObjs : tabObjs[0];
        };

    });
})();
+function ($) {
	//'use strict';

	// Progress CLASS DEFINITION
	// ======================

	/*
		方法：setProgress(<length> | <percentage>)
		<length>: 用长度值来定义宽度。不允许负值, 需要带单位
		<percentage>: 用百分比来定义宽度。不允许负值，需要带%号

		$(".progress").progress("setProgress", "30%");

		事件：update(e, data)
		data.percentage 进度的百分比
		data.length 进度的长度值
		$(".progress").on("update", function(e, data){
			console.log(e, data)
		})
	*/

	var Progress = function (element, options) {
		this.options             = options
		this.$body               = $(document.body)
		this.$element            = $(element)
		this.$bar                = this.$element.find(".progress-bar")
		this.$holder 			 = this.$element.find(".progress-holder")
		this.$tip 				 = this.$element.find(".progress-holder-tip")

		this.lastX 				 = this.$bar.css("flexBasis") - 0;  //利用js变量弱类型转换, 转换字符串到数字
		this.countWidth 		 = this.$element.width() - this.$holder.width();

		this.$element
			.on("touchstart", $.proxy(_touchstart, this))
			.on("touchmove", $.proxy(_touchmove, this))
			.on("touchend", $.proxy(_touchend, this)); 
	}
	var _touchstart = function(e){
		this.startX = e.touches[0].clientX;
		return false;
	}
	var _touchmove = function(e){
		var moveX = e.touches[0].clientX;		

		this.lastX += (moveX - this.startX);

		if( this.lastX > this.countWidth){
			this.lastX = this.countWidth;
		}
		if( this.lastX < 0 ){
			this.lastX = 0;
		}
		if( this.lastX <= this.countWidth && this.lastX >= 0){
			this.startX = moveX;
			this.$bar.css({"flexBasis": this.lastX}); 
			this.percentage = parseInt(this.lastX / this.countWidth * 100) + "%";
			this.$tip.text(this.percentage);
		}
		return false; //e.stopPropagation
	}
	var _touchend = function(){
		this.$element.trigger("update", {percentage:this.percentage, "length":this.lastX + "px"});
		return false;
	}

	Progress.VERSION  = '3.3.5'

	Progress.TRANSITION_DURATION = 300
	Progress.BACKDROP_TRANSITION_DURATION = 150

	Progress.DEFAULTS = {
		backdrop: true,
		keyboard: true,
		show: true
	}

	Progress.prototype.setProgress = function (length) {
		var percentageReg = /(^\d+)%$/;
		var percentageNum;
		// 参数为百分比
		if(percentageReg.test(length)){
			this.percentage = length;
			percentageNum = percentageReg.exec(length)[1];
			this.lastX = parseInt(percentageNum/100 * this.countWidth);
		}else{
			this.lastX = parseInt(length.replace("px", ""));
			this.percentage = parseInt(this.lastX / this.countWidth * 100) + "%";
		}

		this.$bar.css({"flexBasis": this.lastX});	
		this.$tip.text(this.percentage);
		return this;
	}


	// Progress PLUGIN DEFINITION
	// =======================

	function Plugin(option, _relatedTarget) {
		
		return this.each(function () {
			var $this   = $(this)
			var data    = $this.data('bs.progress')
			var options = $.extend({}, Progress.DEFAULTS, $this.data(), typeof option == 'object' && option)

			if (!data) $this.data('bs.progress', (data = new Progress(this, options)))
			if (typeof option == 'string') data[option](_relatedTarget)
			/*else if (options.show) data.show(_relatedTarget)*/
		})
	}

	var old = $.fn.progress

	$.fn.progress             = Plugin
	$.fn.progress.Constructor = Progress


	// Progress NO CONFLICT
	// =================

	$.fn.progress.noConflict = function () {
		$.fn.progress = old
		return this
	}

}(Zepto);

/*
	使用data参数初始化
	<a href="" class="ui-btn" data-toggle="dialog" data-show="true" data-target=".ui-dialog-blue"> 弹窗 </a>

	使用js初始化
	dialog 参数
	show:true|false 默认是否直接显示
	方法：
	show：$(".ui-dialog").dialog('show')
	hide: $(".ui-dialog").dialog('hide')

	事件：
	dialog:cancel 点击取消
	dialog:jump 点击跳转
	dialog:confirm 点击确认
	dialog:show 当dialog显示后触发, 回调函数中除了事件对象event，还有{relatedTarget:指向点击的button}
	dialog:hide 当dialog隐藏后触发
*/

+function ($){
	'use strict';

	var Dialog = $.Dialog = $.Class.extend({
		init: function(element, options){
			this.options = options;
			this.$body = $(document.body);
			this.$element = $(element);
			this.$panel = this.$element.find('.dialog-panel');
			this.$btns = this.$element.find('.dialog-btn');

			this.$element.on('click', $.proxy(function(e){
				if(e.target == e.currentTarget){
					this.hide();
				}
			}, this));

			this.$btns.on('click', $.proxy(function(e){
				var data = $(e.currentTarget).data();
				this.$element.trigger("dialog:" + data.action);
			}, this))
		}, 
		show : function(_relatedTarget){
			this.$element.removeClass('fade');
			this.isShown = true;
			this.$element.trigger("dialog:show", { relatedTarget: _relatedTarget });
		},

		hide : function(_relatedTarget){
			this.$element.addClass('fade')
			this.isShown = false;
			this.$element.trigger("dialog:hide", { relatedTarget: _relatedTarget });
		},

		toggle : function(_relatedTarget){
			if(this.isShown){
				this.hide(_relatedTarget);
			}else{
				this.show(_relatedTarget);
			}
		}
	})

	Dialog.DEFAULTS = {
		show : true
	}

	function Plugin(option, _relatedTarget){

		return this.each(function(){
			var $this = $(this);
			var data = $this.data('d6.dialog')
			var options = $.extend({}, Dialog.DEFAULTS, $this.data(), typeof option == 'object' && option);

			if(!data) $this.data('d6.dialog', (data = new Dialog(this, options)));
			if(typeof option == 'string'){ 
				data[option](_relatedTarget)
			}else if(options.show){
				data.show(_relatedTarget)
			}
		})
	}

	var old = $.fn.dialog;

	$.fn.dialog = Plugin;
	$.fn.dialog.Constructor = Plugin;

	// conflict

	$.fn.dialog.noConflict = function(){
		$.fn.dialog = old;
		return this;
	}

	/*
		zeptojs 支持事件作用域，默认dom事件
		可以采用 'click.xxx.xxx'方式绑定，
		解除以 data-api 为命名空间并绑定在文档上的事件 
		$(document).off('.data-api')
	*/
	$(document).on('click.d6.dialog.data-api', '[data-toggle="dialog"]', function(e){
		var $this = $(this);
		var href = $this.attr('href');
		var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.dialog') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());

		if( $this.is('a') ){
			e.preventDefault();	
		} 

		Plugin.call($target, option, this);
	})

}(Zepto);
!(function($) {
    'use strict'
    /*
    time:2016-07-25
    author:maweichao
    desc:tab选项卡，依赖iscroll和slide插件完成
     */
    var methods = {
        isTouchScreen: function() {
            return (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
        }
    }
    TabBar.v = '1.0.6';
    TabBar.defaults = {
        //选中指定的元素
        active: 0
    };

    function TabBar(ele, opt) {
        this.el = ele;
        this.option = $.extend({}, TabBar.defaults, opt);
        this.init(ele, opt);
    }
    TabBar.prototype.init = function() {
        var _this = this;
        var $el = $(_this.el).addClass('ui-navigator-wrapper'),
            option = _this.option;
        _this.navScroll = new IScroll(_this.el, {
            scrollX: true,
            scrollY: false,
            disableMouse: false,
            disablePointer: true
        })
        var $tabbar = _this.el.$tabbar = $el.find(".tabbar").first();
        _this.el.$bottomLine = $("<div class='btmLine'></div").appendTo($tabbar);
        if ($tabbar.data().target)
            _this.$el_tab =($tabbar.data().target).length > 0 ? $("#" + $tabbar.data().target + "") : undefined;

        if ($el.is('.tabbar')) {
           _this.el = $el.wrap("div").parent()[0];
        }
        if (option.active == undefined) {
            option.active = $tabbar.find('.active').index();
            ~option.active || (option.active = 0);
        }
        //初始化菜单
        _this.swtichTo(option.active);
        //初始化内容
        _this.tabCont();
        $tabbar.on(methods.isTouchScreen ? "tap" : "click", "a.ui-nav-item:not(.active)", function(e) {
            _this.swtichTo($(this).index());
            //调用底部的banner图
            if(_this.slideCont)
            _this.slideCont.slideTo($(this).index(), 1000, false);
        })
    }
    TabBar.prototype.tabCont = function() {
        var _this = this;
        try{
            if (_this.$el_tab.length>0) { 
              _this.slideCont = new Swiper(_this.$el_tab,{ 
                onSlideChangeEnd: function(swiper){
                      _this.swtichTo(swiper.activeIndex)
                }
             });  
          }
        }catch(e){
            console.log("该tabbar没有底部内容");
        }
    }
    TabBar.prototype.slidding = function(index) {
        //根据下标主动选中我要的效果
        var _this=this;
        var left = this.el.$tabbar.offset().left,
            $li = _this.el.$tabbar.find("a.ui-nav-item").removeClass("active").eq(index).addClass("active");
        _this.el.$bottomLine.animate({
            left: $li.offset().left - left,
            width: $li.width()
        }, 200);
        _this.navScroll.scrollToElement($li[0],500);
        _this.el.$tabbar.trigger("switch", { index: index, ele: $li[0] });
    }
    TabBar.prototype.swtichTo = function(index) {
        this.slidding(index);
    }
    var oldplug = $.fn.tabbar;
    function plugin(option) {
        return this.each(function() {
            var $this = $(this)
            var data = $this.data('dt.tabbar')
            var options = $.extend({}, TabBar.defaults, $this.data(), typeof option == 'object' && option)
            if (!data) { $this.data('dt.tabbar', (data = new TabBar(this, options))) }
            if (typeof option == "string") data[oiption]
        })
    }
    $.fn.tabbar = plugin;
    //手动暴漏collapse构造以便外部使用
    $.fn.tabbar.Constructor = TabBar;
    $.fn.collapse.noConflict = function() {
        $.fn.tabbar = oldplug;
        return this;
    };
})($);

/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 * [css:"toast-group"      默然样式
 * duration: 2000          动画时间，默认2s
 * meg:"hello world"       提示内容
 * top:'80%'               提示信息位置，默认据上方80%水平居中]
 */
;
(function($, window, undefined) {
	//toast对象
	var Toast = function(opts){
		this.meg = opts.meg;
		this.duration = opts.duration;
		this.top = opts.top;
		this.css = opts.css;
		this.$body = $(document.body);
		this.createToast();
	}
	
	Toast.prototype = { 
		//创建toast
		createToast:function(){
			//存在toast则删除
			if($("#toastJs").length>0){
				return;
			}
			this.divEle = $('<div id="toastJs"></div>');
			this.divEle.addClass(this.css);
			this.divEle.css('top',this.top);
			this.megEle = $('<span></span>');
			this.megEle.text(this.meg);
			this.divEle.append(this.megEle);
			this.$body.append(this.divEle);
			this.showToast();
		},
		//显示toast
		showToast:function(){
			this.divEle.addClass('toast-show');
			this.setTimeout();
		},
		//隐藏toast
		hideToast:function(){
			this.divEle.remove();
		},
		//倒计时关闭
		setTimeout:function(){
			var _this = this;
			setTimeout(function(){
				_this.hideToast();
			},this.duration);
		}
	}
	
	//对象默认参数
	Toast.default={
		//样式
		css:"ui-toast",
		
		//动画时间，默认2s
		duration: 2000,
		
		//提示内容
		meg:"hello world",
		
		//提示信息为准，默认据上方80%水平居中
		top:'80%'
		
	};
	
	//jquery扩展静态方法
	$.showToast = function(opts){
		opts || (opts = {});
		var opts = $.extend({},Toast.default, opts);
		toastObj = new Toast(opts);
	}

})($, window);
/**
 * 显示提示框
 * @param type   	类型[1:转圈,2:换位旋转]
 * @param content   提示内容
 * @param time  	关闭倒计时时间
 * @param css  		新的ui
 */
;
(function($, window, undefined) {
	//toast对象
	var Loading = function(opts){
		this.meg = opts.meg;
		this.type = opts.type;
		this.imgCss = 'circularRound'+opts.type;
		this.css = opts.css;
		this.show = opts.show;
		this.duration = opts.duration;
		this.$body = $(document.body);
		this.createLoading();
	}
	
	Loading.prototype = { 
		createLoading:function(){
			//存在toast则删除
			if(!this.show){
				$("#loadingJs").remove();
				return;
			}
			if($("#loadingJs").length>0){
				this.hideLoading();
			}
			this.divEle = $('<div data-type="loading" id="loadingJs"></div>');
			this.divEle.addClass(this.css);
			if(this.type){//有动画
				this.loadingEle = $('<div></div>');
				this.loadingEle.addClass(this.imgCss);
				this.divEle.append(this.loadingEle);
				if(this.type==7){
					this.spotPanelEle = $('<div data-type="spotPanel"></div>');
					this.loadingEle.append(this.spotPanelEle);
					this.spanEle1=$('<span data-type="spotOne"></span>');
					this.spanEle2=$('<span data-type="spotTwo"></span>');
					this.spanEle3=$('<span data-type="spotThree"></span>');
					this.spotPanelEle.append(this.spanEle1);
					this.spotPanelEle.append(this.spanEle2);
					this.spotPanelEle.append(this.spanEle3);
				}
			}
			if(this.meg){//有提示信息
				this.megEle = $('<label></label>');
				this.megEle.text(this.meg);
				this.divEle.append(this.megEle);
			}
			this.$body.append(this.divEle);
			this.showLoading();
		},
		
		//显示
		showLoading:function(){
			this.divEle.addClass('loading-show');
			if(this.duration){
				this.setTimeout();
			}
		},
		
		hideLoading:function(){
			this.divEle.remove();
		},
		
		setTimeout:function(){
			var _this = this;
			setTimeout(function(){
				_this.hideLoading();
			},this.duration);
		}
	}
	
	//初始化变量
	Loading.default = {
		//css样式
		css:"ui-loading",
		
		//是否显示[true显示(默认)，false隐藏]
		show:true,
		
		//动画类型[false(无动画),1,2,3,4,5,6,7]
		type:1,
		
		//提示信息[false:无提示信息]
		meg:'加载中...',
		
		//动画时间[false:表示不自动关闭，用户自己关闭]
		duration:false
	}
	
	$.showLoading = function(opts){
		opts || (opts = {});
		var opts = $.extend({},Loading.default, opts);
		LoadingObj = new Loading(opts);
	}
	
})($, window);
/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 */
;
(function($, window, undefined) {
	//Popupmenu对象
	var Popupmenu = function(ele,opts){
		this.$ele = $(ele);
		this.opts  = $.extend({}, Popupmenu.DEFAULTS, opts);
		this.$li = this.$ele.find('ul li');
		if (this.opts.toggle) this.toggle();
		
		this.$ele.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		
		this.$li.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.$li.removeClass('active');
				$(e.target).addClass('active');
				var num =$(e.target).index()+1;
				this.hide(num);
				return $(e.target).id;
			}
		}, this));
	}
	//对象默认参数
	Popupmenu.DEFAULTS={
		
		//是否显示，默认true显示
		toggle: false
	}; 
	
	//显示
	Popupmenu.prototype.show = function(){
		this.$ele.show().addClass('active');
		this.isShown = true;
		var startEvent = $.Event('popupmenu:show')
        this.$ele.trigger(startEvent)
	};
	//隐藏
	Popupmenu.prototype.hide = function(num){
		this.$ele.hide().removeClass('active');
		this.isShown = false;
		var startEvent = $.Event('popupmenu:hide')
        this.$ele.trigger(startEvent,num);
	};
	Popupmenu.prototype.toggle = function() {
    	//通过内容类样式判断是否隐藏
        if(this.isShown){
        	this.hide();
        }else{
        	this.show();
        }
   	};
	function Plugin(option){
		return this.each(function () {  
	    	var $this   = $(this);
            var data = $this.data('d6.popupmenu');
            var options = $.extend({}, Popupmenu.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('d6.popupmenu', (data = new Popupmenu(this, options))) }
            if (typeof option == 'string') data[option]()
	  	}) 
	};
	
	var old =  $.fn.popupmenu ;

	$.fn.popupmenu = Plugin;
	
	 // 执行该函数，恢复原先的button定义，并返回Bootstrap定义的button插件  
	$.fn.popupmenu.noConflict = function () {  
	    $.fn.popupmenu = old ;
	    return this  ;
	}  
	
	$(document).on('click.d6.popupmenu.data-api','[data-toggle="menuBtn"]', function (e) {  
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.popupmenu') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());
        Plugin.call($target, option);
	}) 
})($, window);
/**
 * 显示提示框
 * @param  object  opts 对象属性  
 */
;
(function($, window, undefined) {
	//toast对象
	var PathMenu = function(ele,opts){
		console.log(opts);
		this.$ele = $(ele);
		this.opts  = $.extend({}, PathMenu.DEFAULTS, opts);
		this.$parent = this.$ele.parent();
		this.$liChild = this.$ele.next().find("li *");
		this.$li = this.$ele.next().find("li");
		if (this.opts.toggle) this.toggle();
		
		this.$parent.on('click', $.proxy(function(e){	
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		
		this.$liChild.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).parent().index()+1;
				this.hide(num);
			}
		}, this));
		
		this.$li.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).index()+1;
				this.hide(num);
			}
		}, this));
	}
	//对象默认参数
	PathMenu.DEFAULTS={
		
		//是否显示，默认true显示
		toggle: false
	}; 
	
	//显示
	PathMenu.prototype.show = function(){
		this.$parent.addClass('active');
		this.$ele.prop("checked", true);
		this.isShown = true;
		var startEvent = $.Event('pathMenu:show')
        this.$ele.trigger(startEvent)
	};
	//隐藏
	PathMenu.prototype.hide = function(num){
		this.$parent.removeClass('active');
		
		this.$ele.prop("checked", false);
		this.isShown = false;
		var startEvent = $.Event('pathMenu:hide')
        this.$ele.trigger(startEvent,num);
	};
	PathMenu.prototype.toggle = function() {
    	//通过内容类样式判断是否隐藏
        if(this.isShown){
        	this.hide(0);
        }else{
        	this.show();
        }
   	};
	function Plugin(option){
		return this.each(function () {  
	    	var $this   = $(this);
            var data = $this.data('d6.pathMenu');
            var options = $.extend({}, PathMenu.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('d6.pathMenu', (data = new PathMenu(this, options))) }
            if (typeof option == 'string') data[option]()
	  	}) 
	};
	
	var old =  $.fn.pathMenu ;

	$.fn.pathMenu = Plugin;
	
	 // 执行该函数，恢复原先的button定义，并返回Bootstrap定义的button插件  
	$.fn.pathMenu.noConflict = function () {  
	    $.fn.pathMenu = old ;
	    return this  ;
	}  
	
	$(document).on('click.d6.pathMenu.data-api','[data-toggle="pathmenuBtn"]', function (e) {  
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.pathMenu') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());
        Plugin.call($target, option);
	}) 
})($, window);
/**
 * 选择列表插件
 * varstion 2.0.0
 * by Houfeng
 * Houfeng@DCloud.io
 */

(function($, window, document, undefined) {

	var MAX_EXCEED = 30;
	var VISIBLE_RANGE = 90;
	var DEFAULT_ITEM_HEIGHT = 40;
	var BLUR_WIDTH = 10;

	var rad2deg = $.rad2deg = function(rad) {
		return rad / (Math.PI / 180);
	};

	var deg2rad = $.deg2rad = function(deg) {
		return deg * (Math.PI / 180);
	};

	var platform = navigator.platform.toLowerCase();
	var userAgent = navigator.userAgent.toLowerCase();
	var isIos = (userAgent.indexOf('iphone') > -1 ||
			userAgent.indexOf('ipad') > -1 ||
			userAgent.indexOf('ipod') > -1) &&
		(platform.indexOf('iphone') > -1 ||
			platform.indexOf('ipad') > -1 ||
			platform.indexOf('ipod') > -1);
	//alert(isIos);

	var Picker = $.Picker = function(holder, options) {
		var self = this;
		self.holder = holder;
		self.options = options || {};
		self.init();
		self.initInertiaParams();
		self.calcElementItemPostion(true);
		self.bindEvent();
	};

	Picker.prototype.findElementItems = function() {
		var self = this;
		self.elementItems = [].slice.call(self.holder.querySelectorAll('li'));
		return self.elementItems;
	};

	Picker.prototype.init = function() {
		var self = this;
		self.list = self.holder.querySelector('ul');
		self.findElementItems();
		self.height = self.holder.offsetHeight;
		self.r = self.height / 2 - BLUR_WIDTH;
		self.d = self.r * 2;
		self.itemHeight = self.elementItems.length > 0 ? self.elementItems[0].offsetHeight : DEFAULT_ITEM_HEIGHT;
		self.itemAngle = parseInt(self.calcAngle(self.itemHeight * 0.8));
		self.hightlightRange = self.itemAngle / 2;
		self.visibleRange = VISIBLE_RANGE;
		self.beginAngle = 0;
		self.beginExceed = self.beginAngle - MAX_EXCEED;
		self.list.angle = self.beginAngle;
		if (isIos) {
			self.list.style.webkitTransformOrigin = "center center " + self.r + "px";
		}
	};

	Picker.prototype.calcElementItemPostion = function(andGenerateItms) {
		var self = this;
		if (andGenerateItms) {
			self.items = [];
		}
		self.elementItems.forEach(function(item) {
			var index = self.elementItems.indexOf(item);
			self.endAngle = self.itemAngle * index;
			item.angle = self.endAngle;
			item.style.webkitTransformOrigin = "center center -" + self.r + "px";
			item.style.webkitTransform = "translateZ(" + self.r + "px) rotateX(" + (-self.endAngle) + "deg)";
			if (andGenerateItms) {
				var dataItem = {};
				dataItem.text = item.innerHTML || '';
				dataItem.value = item.getAttribute('data-value') || dataItem.text;
				self.items.push(dataItem);
			}
		});
		self.endExceed = self.endAngle + MAX_EXCEED;
		self.calcElementItemVisibility(self.beginAngle);
	};

	Picker.prototype.calcAngle = function(c) {
		var self = this;
		var a = b = parseFloat(self.r);
		//直径的整倍数部分直接乘以 180
		c = Math.abs(c); //只算角度不关心正否值
		var intDeg = parseInt(c / self.d) * 180;
		c = c % self.d;
		//余弦
		var cosC = (a * a + b * b - c * c) / (2 * a * b);
		var angleC = intDeg + rad2deg(Math.acos(cosC));
		return angleC;
	};

	Picker.prototype.calcElementItemVisibility = function(angle) {
		var self = this;
		self.elementItems.forEach(function(item) {
			var difference = Math.abs(item.angle - angle);
			if (difference < self.hightlightRange) {
				item.classList.add('highlight');
			} else if (difference < self.visibleRange) {
				item.classList.add('visible');
				item.classList.remove('highlight');
			} else {
				item.classList.remove('highlight');
				item.classList.remove('visible');
			}
		});
	};

	Picker.prototype.setAngle = function(angle) {
		var self = this;
		self.list.angle = angle;
		self.list.style.webkitTransform = "perspective(1000px) rotateY(0deg) rotateX(" + angle + "deg)";
		self.calcElementItemVisibility(angle);
	};

	Picker.prototype.bindEvent = function() {
		var self = this;
		var lastAngle = 0;
		var startY = null;
		self.holder.addEventListener('touchstart', function(event) {
			event.preventDefault();
			self.list.style.webkitTransition = '';
			startY = (event.changedTouches ? event.changedTouches[0] : event).pageY;
			lastAngle = self.list.angle;
			self.updateInertiaParams(event, true);
		}, false);
		self.holder.addEventListener('touchend', function(event) {
			event.preventDefault();
			self.startInertiaScroll(event);
		}, false);
		self.holder.addEventListener('touchcancel', function(event) {
			event.preventDefault();
			self.startInertiaScroll(event);
		}, false);
		self.holder.addEventListener('touchmove', function(event) {
			event.preventDefault();
			var endY = (event.changedTouches ? event.changedTouches[0] : event).pageY;
			var dragRange = endY - startY;
			var dragAngle = self.calcAngle(dragRange);
			var newAngle = dragRange > 0 ? lastAngle - dragAngle : lastAngle + dragAngle;
			if (newAngle > self.endExceed) {
				newAngle = self.endExceed
			}
			if (newAngle < self.beginExceed) {
				newAngle = self.beginExceed
			}
			self.setAngle(newAngle);
			self.updateInertiaParams(event);
		}, false);
		//--
		self.list.addEventListener('tap', function(event) {
			elementItem = event.target;
			if (elementItem.tagName == 'LI') {
				self.setSelectedIndex(self.elementItems.indexOf(elementItem), 200);
			}
		}, false);
	};

	Picker.prototype.initInertiaParams = function() {
		var self = this;
		self.lastMoveTime = 0;
		self.lastMoveStart = 0;
		self.stopInertiaMove = false;
	};

	Picker.prototype.updateInertiaParams = function(event, isStart) {
		var self = this;
		var point = event.changedTouches ? event.changedTouches[0] : event;
		if (isStart) {
			self.lastMoveStart = point.pageY;
			self.lastMoveTime = event.timeStamp || Date.now();
			self.startAngle = self.list.angle;
		} else {
			var nowTime = event.timeStamp || Date.now();
			if (nowTime - self.lastMoveTime > 300) {
				self.lastMoveTime = nowTime;
				self.lastMoveStart = point.pageY;
			}
		}
		self.stopInertiaMove = true;
	};

	Picker.prototype.startInertiaScroll = function(event) {
		var self = this;
		var point = event.changedTouches ? event.changedTouches[0] : event;
		/** 
		 * 缓动代码
		 */
		var nowTime = event.timeStamp || Date.now();
		var v = (point.pageY - self.lastMoveStart) / (nowTime - self.lastMoveTime); //最后一段时间手指划动速度  
		var dir = v > 0 ? -1 : 1; //加速度方向  
		var deceleration = dir * 0.0006 * -1;
		var duration = Math.abs(v / deceleration); // 速度消减至0所需时间  
		var dist = v * duration / 2; //最终移动多少 
		var startAngle = self.list.angle;
		var distAngle = self.calcAngle(dist) * dir;
		//----
		var srcDistAngle = distAngle;
		if (startAngle + distAngle < self.beginExceed) {
			distAngle = self.beginExceed - startAngle;
			duration = duration * (distAngle / srcDistAngle) * 0.6;
		}
		if (startAngle + distAngle > self.endExceed) {
			distAngle = self.endExceed - startAngle;
			duration = duration * (distAngle / srcDistAngle) * 0.6;
		}
		//----
		if (distAngle == 0) {
			self.endScroll();
			return;
		}
		self.scrollDistAngle(nowTime, startAngle, distAngle, duration);
	};

	Picker.prototype.scrollDistAngle = function(nowTime, startAngle, distAngle, duration) {
		var self = this;
		self.stopInertiaMove = false;
		(function(nowTime, startAngle, distAngle, duration) {
			var frameInterval = 13;
			var stepCount = duration / frameInterval;
			var stepIndex = 0;
			(function inertiaMove() {
				if (self.stopInertiaMove) return;
				var newAngle = self.quartEaseOut(stepIndex, startAngle, distAngle, stepCount);
				self.setAngle(newAngle);
				stepIndex++;
				if (stepIndex > stepCount - 1 || newAngle < self.beginExceed || newAngle > self.endExceed) {
					self.endScroll();
					return;
				}
				setTimeout(inertiaMove, frameInterval);
			})();
		})(nowTime, startAngle, distAngle, duration);
	};

	Picker.prototype.quartEaseOut = function(t, b, c, d) {
		return -c * ((t = t / d - 1) * t * t * t - 1) + b;
	};

	Picker.prototype.endScroll = function() {
		var self = this;
		if (self.list.angle < self.beginAngle) {
			self.list.style.webkitTransition = "150ms ease-out";
			self.setAngle(self.beginAngle);
		} else if (self.list.angle > self.endAngle) {
			self.list.style.webkitTransition = "150ms ease-out";
			self.setAngle(self.endAngle);
		} else {
			var index = parseInt((self.list.angle / self.itemAngle).toFixed(0));
			self.list.style.webkitTransition = "100ms ease-out";
			self.setAngle(self.itemAngle * index);
		}
		self.triggerChange();
	};

	Picker.prototype.triggerChange = function(force) {
		var self = this;
		if(!$.trigger){
			console.warn("$.trigger Not defined");
		}
		setTimeout(function() {
			var index = self.getSelectedIndex();
			var item = self.items[index];
			if ($.trigger && (index != self.lastIndex || force)) {
				$.trigger(self.holder, 'change', {
					"index": index,
					"item": item
				});
				//console.log('change:' + index);
			}
			self.lastIndex = index;
		}, 0);
	};

	Picker.prototype.correctAngle = function(angle) {
		var self = this;
		if (angle < self.beginAngle) {
			return self.beginAngle;
		} else if (angle > self.endAngle) {
			return self.endAngle;
		} else {
			return angle;
		}
	};

	Picker.prototype.setItems = function(items) {
		var self = this;
		self.items = items || [];
		var buffer = [];
		self.items.forEach(function(item) {
			if (item !== null && item !== undefined) {
				buffer.push('<li>' + (item.text || item) + '</li>');
			}
		});
		self.list.innerHTML = buffer.join('');
		self.findElementItems();
		self.calcElementItemPostion();
		self.setAngle(self.correctAngle(self.list.angle));
		self.triggerChange(true);
	};

	Picker.prototype.getItems = function() {
		var self = this;
		return self.items;
	};

	Picker.prototype.getSelectedIndex = function() {
		var self = this;
		return parseInt((self.list.angle / self.itemAngle).toFixed(0));
	};

	Picker.prototype.setSelectedIndex = function(index, duration) {
		var self = this;
		self.list.style.webkitTransition = '';
		var angle = self.correctAngle(self.itemAngle * index);
		if (duration && duration > 0) {
			var distAngle = angle - self.list.angle;
			self.scrollDistAngle(Date.now(), self.list.angle, distAngle, duration);
		} else {
			self.setAngle(angle);
		}
		self.triggerChange();
	};

	Picker.prototype.getSelectedItem = function() {
		var self = this;
		return self.items[self.getSelectedIndex()];
	};

	Picker.prototype.getSelectedValue = function() {
		var self = this;
		return (self.items[self.getSelectedIndex()] || {}).value;
	};

	Picker.prototype.getSelectedText = function() {
		var self = this;
		return (self.items[self.getSelectedIndex()] || {}).text;
	};

	Picker.prototype.setSelectedValue = function(value, duration) {
		var self = this;
		for (var index in self.items) {
			var item = self.items[index];
			if (item.value == value) {
				self.setSelectedIndex(index, duration);
				return;
			}
		}
	};

	if ($.fn) {
		$.fn.picker = function(options) {
			//遍历选择的元素
			this.each(function(i, element) {
				if (element.picker) return;
				if (options) {
					element.picker = new Picker(element, options);
				} else {
					var optionsText = element.getAttribute('data-picker-options');
					var _options = optionsText ? JSON.parse(optionsText) : {};
					element.picker = new Picker(element, _options);
				}
			});
			return this[0] ? this[0].picker : null;
		};
	}

})(Zepto, window, document, undefined);
//end
/**
 * 弹出选择列表插件
 * 依赖： picker.js
 * varstion 1.0.1
 */

(function($, document) {

	//创建 DOM
	$.dom = function(str) {
		if (typeof(str) !== 'string') {
			if ((str instanceof Array) || (str[0] && str.length)) {
				return [].slice.call(str);
			} else {
				return [str];
			}
		}
		if (!$.__create_dom_div__) {
			$.__create_dom_div__ = document.createElement('div');
		}
		$.__create_dom_div__.innerHTML = str;
		return [].slice.call($.__create_dom_div__.childNodes);
	};

	var panelBuffer = '<div class="ui-citypicker">\
		<div class="ui-citypicker-header">\
			<button class="ui-btn ui-citypicker-btn-cancel">取消</button>\
			<button class="ui-btn ui-btn-blue ui-citypicker-btn-ok">确定</button>\
			<div class="ui-citypicker-clear"></div>\
		</div>\
		<div class="ui-citypicker-body">\
		</div>\
	</div>';

	var pickerBuffer = '<div class="ui-picker">\
		<div class="ui-picker-inner">\
			<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
			<ul class="ui-pciker-list">\
			</ul>\
			<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
		</div>\
	</div>';

	//定义弹出选择器类
	var CityPicker = $.CityPicker = $.Class.extend({
		//构造函数
		init: function(element, options) {
			var self = this;

			self.element = element;

			self.options = options || {};
			self.options.buttons = self.options.buttons || ['取消', '确定'];
			self.panel = $.dom(panelBuffer)[0], document.body.appendChild(self.panel);
			options.theme && self.panel.classList.add(options.theme);

			self.ok = self.panel.querySelector('.ui-citypicker-btn-ok');
			self.cancel = self.panel.querySelector('.ui-citypicker-btn-cancel');
			self.body = self.panel.querySelector('.ui-citypicker-body');
			self.mask = $.createMask && $.createMask();
			self.cancel.innerText = self.options.buttons[0];
			self.ok.innerText = self.options.buttons[1];

			self.dataArray = options.dataArray || ( options.layer == 3 ? cityData3 : cityData ); 

			self.cancel.addEventListener('tap', function(event) {
				self.hide();
			}, false);
			self.ok.addEventListener('tap', function(event) {
				$.trigger(element, 'ok', self.getSelectedItems());
			}, false);
			/*self.mask[0].addEventListener('tap', function() {
				self.hide();
			}, false);*/
			self._createPicker();

			self.setData(self.dataArray)
			//防止滚动穿透
			self.panel.addEventListener('touchstart', function(event) {
				event.preventDefault();
			}, false);
			self.panel.addEventListener('touchmove', function(event) {
				event.preventDefault();
			}, false);
		},
		_createPicker: function() {
			var self = this;
			var layer = self.options.layer || 1;
			var width = (100 / layer) + '%';
			self.pickers = [];
			for (var i = 1; i <= layer; i++) {
				var pickerElement = $.dom(pickerBuffer)[0];
				pickerElement.style.width = width;
				self.body.appendChild(pickerElement);
				var picker = $(pickerElement).picker();
				self.pickers.push(picker);
				pickerElement.addEventListener('change', function(event) {
					var nextPickerElement = this.nextSibling;
					if (nextPickerElement && nextPickerElement.picker) {
						var eventData = event.detail || {};
						var preItem = eventData.item || {};
						nextPickerElement.picker.setItems(preItem.children);
					}
				}, false);
			}
		},
		//填充数据
		setData: function(data) {
			var self = this;
			data = data || [];
			self.pickers[0].setItems(data);
		},
		//获取选中的项（数组）
		getSelectedItems: function() {
			var self = this;
			var items = [];
			for (var i in self.pickers) {
				var picker = self.pickers[i];
				items.push(picker.getSelectedItem() || {});
			}
			return items;
		},
		//显示
		show: function() {
			var self = this;
			//self.mask.show();
			document.body.classList.add($.className('citypicker-active-for-page'));
			self.panel.classList.add($.className('active'));
			//处理物理返回键
			self.__back = $.back;
			$.back = function() {
				self.hide();
			};
			self.isShow = true;
		},
		//隐藏
		hide: function() {
			var self = this;
			if (self.disposed) return;
			self.panel.classList.remove($.className('active'));
			//self.mask.close();
			document.body.classList.remove($.className('citypicker-active-for-page'));
			//处理物理返回键
			$.back=self.__back;
			self.isShow = false;
		},
		toggle: function(){
			var self = this;
			if(self.isShow){
				self.hide();
			}else{
				self.show();
			}
		},
		dispose: function() {
			var self = this;
			self.hide();
			setTimeout(function() {
				self.panel.parentNode.removeChild(self.panel);
				for (var name in self) {
					self[name] = null;
					delete self[name];
				};
				self.disposed = true;
			}, 300);
		}
	});

	CityPicker.DEFAULTS = {
		show : true
	};
	// Progress PLUGIN DEFINITION
	// =======================

	function Plugin(option, _relatedTarget) {
		return this.each(function () {
			var $this   = $(this)
			var data    = $this.data('d6.cityPicker')

			var options = $.extend({}, CityPicker.DEFAULTS, $this.data(), typeof option == 'object' && option)

			if (!data) $this.data('d6.cityPicker', (data = new CityPicker(this, options)))
			if (typeof option == 'string') data[option](_relatedTarget)
			else if (options.show) data.show(_relatedTarget)
		})
	}

	var old = $.fn.cityPicker

	$.fn.cityPicker             = Plugin
	$.fn.cityPicker.Constructor = CityPicker


	// Progress NO CONFLICT
	// =================

	$.fn.cityPicker.noConflict = function () {
		$.fn.cityPicker = old
		return this
	}

		/*
		zeptojs 支持事件作用域，默认dom事件
		可以采用 'click.xxx.xxx'方式绑定，
		解除以 data-api 为命名空间并绑定在文档上的事件 
		$(document).off('.data-api')
	*/
	$(document).on('click.d6.cityPicker.data-api', '[data-toggle="cityPicker"]', function(e){
		var $this = $(this);
		var options = $this.data('d6.cityPicker') ? 'toggle' : {};

		if( $this.is('a') ){
			e.preventDefault();	
		} 

		Plugin.call($this, options, this);
	})

})(Zepto, document);
/**
 * 日期时间插件
 * varstion 1.0.5
 * by Houfeng
 * Houfeng@DCloud.io
 */

(function($, document) {
	
	//创建 DOM
	$.dom = function(str) {
		if (typeof(str) !== 'string') {
			if ((str instanceof Array) || (str[0] && str.length)) {
				return [].slice.call(str);
			} else {
				return [str];
			}
		}
		if (!$.__create_dom_div__) {
			$.__create_dom_div__ = document.createElement('div');
		}
		$.__create_dom_div__.innerHTML = str;
		return [].slice.call($.__create_dom_div__.childNodes);
	};
	
	var domBuffer = '<div class="ui-dtpicker" data-type="datetime">\
		<div class="ui-dtpicker-header">\
			<button data-id="btn-cancel" class="ui-btn">取消</button>\
			<button data-id="btn-ok" class="ui-btn ui-btn-blue">确定</button>\
		</div>\
		<div class="ui-dtpicker-title"><h5 data-id="title-y">年</h5><h5 data-id="title-m">月</h5><h5 data-id="title-d">日</h5><h5 data-id="title-h">时</h5><h5 data-id="title-i">分</h5></div>\
		<div class="ui-dtpicker-body">\
			<div data-id="picker-y" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-m" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-d" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-h" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
			<div data-id="picker-i" class="ui-picker">\
				<div class="ui-picker-inner">\
					<div class="ui-pciker-rule ui-pciker-rule-ft"></div>\
					<ul class="ui-pciker-list">\
					</ul>\
					<div class="ui-pciker-rule ui-pciker-rule-bg"></div>\
				</div>\
			</div>\
		</div>\
	</div>';

	//plugin
	var DtPicker = $.DtPicker = $.Class.extend({
		init: function(element, options) {
			var self = this;
			var _picker = $.dom(domBuffer)[0];
			options.theme && _picker.classList.add(options.theme);
			self.$element = $(element);

			document.body.appendChild(_picker);
			$('[data-id*="picker"]', _picker).picker();
			var ui = self.ui = {
				picker: _picker,
				mask: $.createMask && $.createMask(),
				ok: $('[data-id="btn-ok"]', _picker)[0],
				cancel: $('[data-id="btn-cancel"]', _picker)[0],
				y: $('[data-id="picker-y"]', _picker)[0],
				m: $('[data-id="picker-m"]', _picker)[0],
				d: $('[data-id="picker-d"]', _picker)[0],
				h: $('[data-id="picker-h"]', _picker)[0],
				i: $('[data-id="picker-i"]', _picker)[0],
				labels: $('[data-id*="title-"]', _picker),
			};
			ui.cancel.addEventListener('tap', function() {
				self.hide();
			}, false);

			ui.ok.addEventListener('tap', function() {
				$.trigger(element, 'ok', self.getSelected());
			}, false);

			ui.y.addEventListener('change', function() {
				self._createDay();
			}, false);

			ui.m.addEventListener('change', function() {
				self._createDay();
			}, false);
			/*ui.mask[0].addEventListener('tap', function() {
				self.hide();
			}, false);*/
			self._create(options);
			//防止滚动穿透
			self.ui.picker.addEventListener('touchstart',function(event){
				event.preventDefault();  
			},false);
			self.ui.picker.addEventListener('touchmove',function(event){
				event.preventDefault();  
			},false);
		},
		getSelected: function() {
			var self = this;
			var ui = self.ui;
			var type = self.options.type;
			var selected = {
				type: type,
				y: ui.y.picker.getSelectedItem(),
				m: ui.m.picker.getSelectedItem(),
				d: ui.d.picker.getSelectedItem(),
				h: ui.h.picker.getSelectedItem(),
				i: ui.i.picker.getSelectedItem(),
				toString: function() {
					return this.value;
				}
			};
			switch (type) {
				case 'datetime':
					selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value + ' ' + selected.h.value + ':' + selected.i.value;
					selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text + ' ' + selected.h.text + ':' + selected.i.text;
					break;
				case 'date':
					selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value;
					selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text;
					break;
				case 'time':
					selected.value = selected.h.value + ':' + selected.i.value;
					selected.text = selected.h.text + ':' + selected.i.text;
					break;
				case 'month':
					selected.value = selected.y.value + '-' + selected.m.value;
					selected.text = selected.y.text + '-' + selected.m.text;
					break;
				case 'hour':
					selected.value = selected.y.value + '-' + selected.m.value + '-' + selected.d.value + ' ' + selected.h.value;
					selected.text = selected.y.text + '-' + selected.m.text + '-' + selected.d.text + ' ' + selected.h.text;
					break;
			}
			return selected;
		},
		setSelectedValue: function(value) {
			var self = this;
			var ui = self.ui;
			var parsedValue = self._parseValue(value);
			ui.y.picker.setSelectedValue(parsedValue.y, 0);
			ui.m.picker.setSelectedValue(parsedValue.m, 0);
			ui.d.picker.setSelectedValue(parsedValue.d, 0);
			ui.h.picker.setSelectedValue(parsedValue.h, 0);
			ui.i.picker.setSelectedValue(parsedValue.i, 0);
		},
		isLeapYear: function(year) {
			return (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
		},
		_inArray: function(array, item) {
			for (var index in array) {
				var _item = array[index];
				if (_item === item) return true;
			}
			return false;
		},
		getDayNum: function(year, month) {
			var self = this;
			if (self._inArray([1, 3, 5, 7, 8, 10, 12], month)) {
				return 31;
			} else if (self._inArray([4, 6, 9, 11], month)) {
				return 30;
			} else if (self.isLeapYear(year)) {
				return 29;
			} else {
				return 28;
			}
		},
		_fill: function(num) {
			num = num.toString();
			if (num.length < 2) {
				num = 0 + num;
			}
			return num;
		},
		_createYear: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成年列表
			var yArray = [];
			if (options.custom.y) {
				yArray = options.custom.y;
			} else {
				var yBegin = options.beginyear;
				var yEnd = options.endyear;
				for (var y = yBegin; y <= yEnd; y++) {
					yArray.push({
						text: y + '',
						value: y
					});
				}
			}
			ui.y.picker.setItems(yArray);
			//ui.y.picker.setSelectedValue(current);
		},
		_createMonth: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成月列表
			var mArray = [];
			if (options.custom.m) {
				mArray = options.custom.m;
			} else {
				for (var m = 1; m <= 12; m++) {
					var val = self._fill(m);
					mArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.m.picker.setItems(mArray);
			//ui.m.picker.setSelectedValue(current);
		},
		_createDay: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成日列表
			var dArray = [];
			if (options.custom.d) {
				dArray = options.custom.d;
			} else {
				var maxDay = self.getDayNum(parseInt(ui.y.picker.getSelectedValue()), parseInt(ui.m.picker.getSelectedValue()));
				for (var d = 1; d <= maxDay; d++) {
					var val = self._fill(d);
					dArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.d.picker.setItems(dArray);
			current = current || ui.d.picker.getSelectedValue();
			//ui.d.picker.setSelectedValue(current);
		},
		_createHours: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成时列表
			var hArray = [];
			if (options.custom.h) {
				hArray = options.custom.h;
			} else {
				for (var h = 0; h <= 23; h++) {
					var val = self._fill(h);
					hArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.h.picker.setItems(hArray);
			//ui.h.picker.setSelectedValue(current);
		},
		_createMinutes: function(current) {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			//生成分列表
			var iArray = [];
			if (options.custom.i) {
				iArray = options.custom.i;
			} else {
				for (var i = 0; i <= 59; i++) {
					var val = self._fill(i);
					iArray.push({
						text: val,
						value: val
					});
				}
			}
			ui.i.picker.setItems(iArray);
			//ui.i.picker.setSelectedValue(current);
		},
		_setLabels: function() {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			ui.labels.each(function(i, label) {
				label.innerText = options.labels[i];
			});
		},
		_setButtons: function() {
			var self = this;
			var options = self.options;
			var ui = self.ui;
			ui.cancel.innerText = options.buttons[0];
			ui.ok.innerText = options.buttons[1];
		},
		_parseValue: function(value) {
			var self = this;
			var rs = {};
			if (value) {
				var parts = value.replace(":", "-").replace(" ", "-").split("-");
				rs.y = parts[0];
				rs.m = parts[1];
				rs.d = parts[2];
				rs.h = parts[3];
				rs.i = parts[4];
			} else {
				var now = new Date();
				rs.y = now.getFullYear();
				rs.m = now.getMonth() + 1;
				rs.d = now.getDate();
				rs.h = now.getHours();
				rs.i = now.getMinutes();
			}
			return rs;
		},
		_create: function(options) {
			var self = this;
			options = options || {};
			options.labels = options.labels || ['年', '月', '日', '时', '分'];
			options.buttons = options.buttons || ['取消', '确定'];
			options.type = options.type || 'datetime';
			options.custom = options.custom || {};
			self.options = options;
			var now = new Date();
			options.beginyear = options.beginyear || (now.getFullYear() - 5);
			options.endyear = options.endyear || (now.getFullYear() + 5);
			var ui = self.ui;
			//设定label
			self._setLabels();
			self._setButtons();
			//设定类型
			ui.picker.setAttribute('data-type', options.type);
			//生成
			self._createYear();
			self._createMonth();
			self._createDay();
			self._createHours();
			self._createMinutes();
			//设定默认值
			self.setSelectedValue(options.value);
		},
		//显示
		show: function(callback) {
			var self = this;
			var ui = self.ui;
			self.callback = callback || $.noop;
			//ui.mask.show();
			document.body.classList.add($.className('dtpicker-active-for-page'));
			ui.picker.classList.add($.className('active'));
			self.isShown = true;

			//处理物理返回键
			self.__back = $.back;
			$.back = function() {
				self.hide();
			};
		},
		hide: function() {
			var self = this;
			if (self.disposed) return;
			var ui = self.ui;
			ui.picker.classList.remove($.className('active'));
			self.isShown = false;
			//ui.mask.close();
			document.body.classList.remove($.className('dtpicker-active-for-page'));
			//处理物理返回键
			$.back=self.__back;
		},
		toggle: function(){
			var self = this;
			self.isShown ? self.hide() : self.show();
		},
		dispose: function() {
			var self = this;
			self.hide();
			setTimeout(function() {
				self.ui.picker.parentNode.removeChild(self.ui.picker);
				for (var name in self) {
					self[name] = null;
					delete self[name];
				};
				self.disposed = true;
			}, 300);
		}
	});

	DtPicker.DEFAULTS = {
		show : true
	};
	// Progress PLUGIN DEFINITION
	// =======================

	function Plugin(option, _relatedTarget) {
		console.log("me--- ")
		return this.each(function () {
			var $this   = $(this)
			var data    = $this.data('d6.dtPicker')

			var options = $.extend({}, DtPicker.DEFAULTS, $this.data(), typeof option == 'object' && option)

			if (!data) $this.data('d6.dtPicker', (data = new DtPicker(this, options)))
			if (typeof option == 'string') data[option](_relatedTarget)
			else if (options.show) data.show(_relatedTarget)
		})
	}

	var old = $.fn.dtPicker

	$.fn.dtPicker             = Plugin
	$.fn.dtPicker.Constructor = DtPicker

	// Progress NO CONFLICT
	// =================

	$.fn.dtPicker.noConflict = function () {
		$.fn.dtPicker = old
		return this
	}

		/*
		zeptojs 支持事件作用域，默认dom事件
		可以采用 'click.xxx.xxx'方式绑定，
		解除以 data-api 为命名空间并绑定在文档上的事件 
		$(document).off('.data-api')
	*/
	$(document).on('click.d6.dtPicker.data-api', '[data-toggle="dtPicker"]', function(e){
		var $this = $(this);
		var options = $this.data('d6.dtPicker') ? 'toggle' : {};

		if( $this.is('a') ){
			e.preventDefault();	
		} 

		Plugin.call($this, options, this);
	})

})(Zepto, document);
/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 */
;
(function($, window, undefined) {
	//Popupmenu对象
	var ActionSheet = function(ele,opts){
		this.$ele = $(ele);
		this.opts  = $.extend({}, ActionSheet.DEFAULTS, opts);
		this.$ul = this.$ele.find('ul');
		this.$li = this.$ele.find('ul li');
		this.$liChild = this.$ele.find("li *");
		this.$cancelBtn = this.$ele.find('div[data-type=cancel-btn]');
		if (this.opts.toggle) this.toggle();
		
		this.$ele.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		this.$ul.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(-1);
			}
		}, this));
		this.$cancelBtn.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				this.hide(0);
			}
		}, this));
		this.$li.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).index()+1;
				this.hide(num);
				return $(e.target).id;
			}
		}, this));
		
		this.$liChild.on('click', $.proxy(function(e){
			if(e.target == e.currentTarget){
				var num =$(e.target).parent().index()+1;
				this.hide(num);
				return $(e.target).id;
			}
		}, this));
	}
	//对象默认参数
	ActionSheet.DEFAULTS={
		
		//是否显示，默认true显示
		toggle: false
	}; 
	
	//显示
	ActionSheet.prototype.show = function(){
		this.$ele.show().addClass('active').removeClass('inactive');
		this.isShown = true;
		var startEvent = $.Event('actionSheet:show')
        this.$ele.trigger(startEvent)
	};
	//隐藏
	ActionSheet.prototype.hide = function(num){
		$this = this;
		this.$ele.addClass('inactive').removeClass('active');
		setTimeout(function(){
			$this.$ele.hide();
		},300);
		this.isShown = false;
		var startEvent = $.Event('actionSheet:jump')
        this.$ele.trigger(startEvent,num);
	};
	ActionSheet.prototype.toggle = function() {
    	//通过内容类样式判断是否隐藏
        if(this.isShown){
        	this.hide();
        }else{
        	this.show();
        }
   	};
	function Plugin(option){
		return this.each(function () {  
	    	var $this   = $(this);
            var data = $this.data('d6.actionSheet');
            var options = $.extend({}, ActionSheet.DEFAULTS, $this.data(), typeof option == 'object' && option)
            if (!data && options.toggle && /show|hide/.test(option)) options.toggle = false
            if (!data) { $this.data('d6.actionSheet', (data = new ActionSheet(this, options))) }
            if (typeof option == 'string') data[option]()
	  	}) 
	};
	
	var old =  $.fn.actionSheet ;

	$.fn.actionSheet = Plugin;
	
	 // 执行该函数，恢复原先的button定义，并返回Bootstrap定义的button插件  
	$.fn.actionSheet.noConflict = function () {  
	    $.fn.actionSheet = old ;
	    return "你好"  ;
	}  
	
	$(document).on('click.d6.actionSheet.data-api','[data-toggle="actionSheet"]', function (e) {  
        var $this = $(this);
        var href = $this.attr('href');
        var $target = $($this.attr('data-target') || (href && href.replace(/.*(?=#[^\s]+$)/, '')));
		var option = $target.data('d6.actionSheet') ? 'toggle' : $.extend({ remote: !/#/.test(href) && href}, $target.data(), $this.data());
        Plugin.call($target, option);
	}) 
})($, window);
/**
 * 显示提示框
 * @param  object  opts 对象属性  
 * opts中的属性
 */
;
(function($, window, undefined) {
	var cssPrefix = $.fx.cssPrefix;//浏览器前缀
	var transitionEnd = $.fx.transitionEnd;
    var translateZ = ' translateZ(0)';
	
	var CLASS_FULLPAGE_ARROW = 'fullpage-arrow',
        CLASS_FULLPAGE_INNER = 'fullPage-inner',
        CLASS_FULLPAGE_PAGE = 'fullpage-page',
        CLASS_STATE_ACTIVE = 'active',
        CLASS_FULLPAGE_DOTS = 'fullpage-dots';
    
    var SELECTOR_FULLPAGE_INNER = '.' + CLASS_FULLPAGE_INNER,
        SELECTOR_FULLPAGE_PAGE = '.' + CLASS_FULLPAGE_PAGE;
    
    var domArrow = '<span class="'+CLASS_FULLPAGE_ARROW+'"><b class="iconfont icon-up-button"></b></span>';
	var domInner = '<div class="'+CLASS_FULLPAGE_INNER+'"></div>';
	
	var domDots = '<div class="' + CLASS_FULLPAGE_DOTS + '"><%= new Array( len + 1 )' +
        '.join("<i></i>") %></div>';
	
	//渲染组件
    var render = function() {
        var _fp = this,
            opts = _fp.opts;
        _fp.curIndex = 0;
        _fp.startY = 0;
        _fp.movingFlag = false;
        opts.der = 0.1;//【？？？？】
        _fp.ref.children().wrapAll(domInner);//给轮播加一层
        _fp._inner = _fp.ref.find(SELECTOR_FULLPAGE_INNER);//找到轮播这层
        _fp._pages = _fp.ref.find(SELECTOR_FULLPAGE_PAGE);//找到单个轮播层
        _fp.pagesLength = _fp._pages.length;//确定有几个轮播page
        opts.dots && initDots.call(_fp);//给页面添加轮播的原点
        update.call(_fp);//设置高度及滚动方式
        _fp.status = 1;
        opts.arrow && (_fp._arrow = $(domArrow).appendTo(_fp.ref));
//      opts.gesture && (opts.loop = false)
    };
    
    var bind = function() {
    	console.log("4444444444");
        var _fp = this,
            opts = _fp.opts;
        if(!opts.isHandSlide){
        	return;
        }
        _fp._inner.on('touchstart', function(e) {
            if (!_fp.status) {
                return 1;
            }
            if (_fp.movingFlag) {
                return 0;
            }

            _fp.startX = e.targetTouches[0].pageX;
            _fp.startY = e.targetTouches[0].pageY;
        });
        _fp._inner.on('touchend', function(e) {
            if (!_fp.status) {
                return 1;
            }
            if (_fp.movingFlag) {
                return 0;
            }
            var sub = (e.changedTouches[0].pageY - _fp.startY) / _fp.height;
            var der = ((sub > 0 && sub > opts.der) || (sub < 0 && sub < -opts.der)) ? sub > 0 ? -1 : 1 : 0;
            _fp.dir = -der // -1 向上 1 向下
            moveTo.call(_fp, _fp.curIndex + der, true);

        });
//      if (opts.gesture) {
//          _fp._inner.on('touchmove', function(e) {
//              if (!_fp.status) {
//                  return 1;
//              }
//              if (_fp.movingFlag) {
//                  _fp.startX = e.targetTouches[0].pageX;
//                  _fp.startY = e.targetTouches[0].pageY;
//                  return 0;
//              }
//
//              var y = e.changedTouches[0].pageY - _fp.startY;
//              if ((_fp.curIndex == 0 && y > 0) || (_fp.curIndex === _fp.pagesLength - 1 && y < 0)) y /= 2;
//              if ((_fp.curIndex == 0 && y > 0) || (_fp.curIndex == _fp.pagesLength - 1 && y < 0)) {
//                  y = 0;
//              }
//              var dist = (-_fp.curIndex * _fp.height + y);
//              _fp._inner.removeClass('anim');
//              _fp._inner.css({
//                  '-webkit-transform': 'translate3d(' + 0 + 'px , ' + dist + 'px , 0px);',
//                  'transform': 'translate3d(' + 0 + 'px , ' + dist + 'px , 0px);'
//              });
//          });
//          e.preventDefault();
//      }else{
        	_fp._inner.on('touchmove', function(e) {
        		e.preventDefault();
        	})
//      }

        // 翻转屏幕提示
        // ==============================      
        // 转屏事件检测
        $(window).on('ortchange', function(evt) {
            _fp.ref.trigger('ortchange');
        });

        _fp._inner.on(transitionEnd,
            $.proxy(tansitionEnd, _fp));
    };

    
    
    var tansitionEnd = function(evt) {
        var _fp = this,
            opts = _fp.opts;
        _fp.ref.trigger('afterChange', [_fp.curIndex]);
    };
    //设置高度及滚动方式
    var update = function() {
    	console.log("777777")
        var _fp = this,
            opts = _fp.opts;
        if (opts.fullPage) {//是否全屏
            $(document.body).css('position', 'absolute');
            $(document.body).height($(window).height());
            _fp.height = $(document.body).height();
        } else {
            _fp.height = _fp.ref.parent().height();
        }
        _fp.ref.height(_fp.height);
        _fp._pages.height(_fp.height);
//      if (!opts.gesture) {
            $.each(_fp._pages, function(index, el) {
                move.call(_fp, index, 0);
            })
            move.call(_fp, _fp.curIndex, 0);
//      }
    };
    
    /*滚动
     * pageNum ：当前页面编号
     */
    var move = function(pageNum, speed) {
    	console.log("88888")
        isMove = true;
        var _fp = this,
            opts = _fp.opts;
        var prePageNum = pageNum - 1 > -1 ? pageNum - 1 : _fp.pagesLength - 1;//前一页
        var nextPageNum = pageNum + 1 < _fp.pagesLength ? pageNum + 1 : 0;//后一页
        if (speed == 0) {//【？？？】
            speed = speedPre = speedNext = 0;
        } else {
            speed = speedPre = speedNext = opts.speed
        }
        if (_fp.dir == 1) { // 【-1 向上 1 向下】
            speedPre = 0;
        } else {
            speedNext = 0;
        }
		
		var pageOffsetTop = 0-_fp._pages[pageNum].offsetTop;
		var preOffsetTop = 0-_fp._pages[prePageNum].offsetTop;
		var nextOffsetTop = 0-_fp._pages[nextPageNum].offsetTop;
		
        if (_fp.pagesLength == 1) {
            _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                pageOffsetTop + 'px)' + translateZ + ';';
        	
        } else if (_fp.pagesLength == 2) {
        	
            if (typeof _fp.dir === 'undefined') {
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    pageOffsetTop + 'px)' + translateZ + ';';
               _fp._pages[nextPageNum].style.cssText += cssPrefix + 'transition-duration:' + 0 +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (nextOffsetTop + _fp.height) + 'px)' + translateZ + ';';
            } else if (_fp.dir == -1) { //向上
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + 0 +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (pageOffsetTop + _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[prePageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (preOffsetTop - _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    pageOffsetTop + 'px)' + translateZ + ';';
//				
            } else if (_fp.dir == 1) { //向下
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + 0 +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (pageOffsetTop - _fp.height - _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[prePageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    (preOffsetTop + _fp.height) + 'px)' + translateZ + ';';
                _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                    'ms;' + cssPrefix + 'transform: translate(0,' +
                    pageOffsetTop + 'px)' + translateZ + ';';
            	
            }
        } else {
            _fp._pages[prePageNum].style.cssText += cssPrefix + 'transition-duration:' + speedPre +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                (preOffsetTop - _fp.height) + 'px)' + translateZ + ';';
            _fp._pages[pageNum].style.cssText += cssPrefix + 'transition-duration:' + speed +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                pageOffsetTop + 'px)' + translateZ + ';';
            _fp._pages[nextPageNum].style.cssText += cssPrefix + 'transition-duration:' + speedNext +
                'ms;' + cssPrefix + 'transform: translate(0,' +
                (nextOffsetTop + _fp.height) + 'px)' + translateZ + ';';
//      	
        }
    };
    
    var moveTo = function(next, anim) {
        var _fp = this,
            opts = _fp.opts;
        var cur = _fp.curIndex;

        next = fix.call(_fp, next, _fp.pagesLength, opts.loop);

        if (anim) {
            _fp._inner.addClass('anim');
        } else {
            _fp._inner.removeClass('anim');
        }

        if (next !== cur) {
            _fp.ref.trigger('beforeChange', [cur, next]);
        } else {
            return;
        }

        _fp.movingFlag = true;
        _fp.curIndex = next;
//      if (!opts.gesture) {
            move.call(_fp, next);
//      } else {
//          _fp._inner.css({
//              '-webkit-transform': 'translate3d(' + 0 + 'px , ' + (-next * _fp.height) + 'px , 0px);',
//              'transform': 'translate3d(' + 0 + 'px , ' + (-next * _fp.height) + 'px , 0px);'
//          });
//      }

        if (next !== cur) {
            _fp.ref.trigger('change', [cur, next]);
        }

        window.setTimeout(function() {
            _fp.movingFlag = false;
            if (next !== cur) {
                _fp._pages.removeClass('active').eq(next).addClass('active');
                opts.dots && updateDots.apply(_fp, [next, cur]);
            }
        }, opts.speed + 100);

        return this;
    };
	
	var fix = function(cur, pagesLength, loop) {
        var _fp = this;
        if (cur < 0) {
            return !!loop ? pagesLength - 1 : 0;
        }

        if (cur >= pagesLength) {
            if (!!loop) {
                return 0;
            } else {
                return pagesLength - 1;
            }
        }


        return cur;
    };
	
    //给页面添加轮播的原点
    var initDots = function() {
    	console.log("5555555")
        var _fp = this,
            opts = _fp.opts;

        var dots = _fp.parseTpl(domDots, {
            len: _fp.pagesLength
        });
        dots = $(dots).appendTo(_fp.ref[0]);

        _fp._dots = dots.children().toArray();

        updateDots.call(_fp, _fp.curIndex);
    };
    
    /**
     * 更新dots
     */
    var updateDots = function(to, from) {
    	console.log("66666")
        var _fp = this,
            dots = _fp._dots;
        typeof from === 'undefined' || $(dots[from % _fp.pagesLength]).removeClass(CLASS_STATE_ACTIVE);
        $(dots[to % _fp.pagesLength]).addClass(CLASS_STATE_ACTIVE);
    };
    
	define(function($ui){
		var $fullpage = $ui.define('Fullpage', {
            loop: false,//循环
//          gesture: false,//是否滑动
            isHandSlide:true,//是否手动滑
            dots: false,//是否要圆点
            arrow: false,//是否要底部图标
            fullPage: true,//是否整屏
            speed: 500//自动跳转频率
        });
        //初始化
        $fullpage.prototype.init = function() {
        	console.log("222222");
            render.call(this);
            bind.call(this);
        };
        
        $.extend($fullpage.prototype, {
            start: function() {
                this.status = 1;
                return this;
            },
            stop: function() {
                this.status = 0;
                return this;
            },
            moveTo: function(next) {
                moveTo.call(this, next, true);
                return this;
            },
            prev: function() {
                this.moveTo(this.curIndex - 1);
                return this;
            },
            next: function() {
                this.moveTo(this.curIndex + 1);
                return this;
            },
            getCurIndex: function() {
                return this.curIndex;
            }
        });
        
        //注册$插件
        $.fn.fullpage = function(opts) {
        	console.log("1111111111");
            var fullpageObjs = [];
            opts || (opts = {});
            this.each(function() {
                var fullpageObj = null;
                var id = this.getAttribute('data-fullpage');
                if (!id) {
                    opts = $.extend(opts, {
                        ref: this
                    });
                    id = ++$ui.uuid;
                    fullpageObj = $ui.data[id] = new $fullpage(opts);
                    this.setAttribute('data-fullpage', id);
                } else {
                    fullpageObj = $ui.data[id];
                }
                fullpageObjs.push(fullpageObj);
            });
            return fullpageObjs.length > 1 ? fullpageObjs : fullpageObjs[0];
        };
	})
})($, window);
!(function($) {
    'use strict'

    function NavSlide(ele, option) {
        this.option = $.extend({}, this.DEFAULTS, option);
        this.el = ele;
        this.init();
    }
    NavSlide.v = '1.0';
    NavSlide.DEFAULTS = {
        direction: "right", //默认是向左滑动
        maxslide: 0,
        nowLeft: 0,
        speed: 500,
    }
    NavSlide.prototype.init = function() {
        var _this = this;
        //滑动宽度赋值
        _this.el.$operation = $(_this.el).find(".operation");
        _this.el.$cont = $(_this.el).find(".cont");
        _this.option.maxslide = _this.el.$operation.width();
        //绑定事件
        _this.bind();
    }
    NavSlide.prototype.bind = function() {
        var _this = this;
         //设定初始位置
        $(_this.el).on("touchstart", '.cont', function(e) {
            //设定初始位置
            /*if (event.preventDefault) {
                    event.preventDefault();
                } else {
                    event.returnValue = false;
                }*/
            _this.option.point_x = e.touches[0].screenX;
            _this.option.point_y = e.touches[0].screenY;

            _this.option.init_x = e.touches[0].screenX;

            _this.option.moveDistance = 0;
        }).on("touchmove", function(e) {

            if (e.touches.length == 1) {
                _this.touchmove(e.touches[0].screenX, e.touches[0].screenY);
            }
        }).on("touchend", function(e) {
            _this.touchend();
        })
    }
    NavSlide.prototype.touchmove = function(x, y) {
        var _this = this,
            change_x = x - (_this.option.point_x === null ? x : _this.option.point_x);
        //保留移动的距离
        _this.option.moveDistance = x - _this.option.init_x //移动的总长度
            //锁定滑动范围以及滑动距离
        if (Math.abs(_this.option.moveDistance) < _this.option.maxslide && (_this.option.direction == "left") ? (_this.option.nowLeft >= -this.option.maxslide && _this.option.nowLeft <= 0) : (_this.option.nowLeft <= this.option.maxslide && _this.option.nowLeft >= 0)) {
            if (Math.abs(_this.option.nowLeft) == this.option.maxslide || Math.abs(_this.option.nowLeft) == 0) {
                //禁止向左滑动
                if ((_this.option.direction == "left") ? Math.abs(_this.option.nowLeft) == this.option.maxslide : _this.option.nowLeft == 0) {
                    if (_this.option.moveDistance > 0)
                        _this.option.nowLeft = _this.option.nowLeft + change_x;
                    else
                        _this.option.moveDistance = 0
                } else {
                    //禁止向右边滑动
                    if (_this.option.moveDistance < 0)
                        _this.option.nowLeft = _this.option.nowLeft + change_x;
                    else
                        _this.option.moveDistance = 0
                }
            } else {
                _this.option.nowLeft = _this.option.nowLeft + change_x;
            }
            _this.option.point_x = x;
            _this.style(false);
        }
    }
    NavSlide.prototype.touchend = function() {
        //判断滑动是否超过所需滑动的四分之一
        var _this = this;
        if (Math.abs(_this.option.moveDistance) > _this.option.maxslide / 4) {
            if (_this.option.direction == "left") {
                _this.option.nowLeft = (_this.option.moveDistance > 0) ? 0 : -_this.option.maxslide;
                $(_this.el).parent().trigger("open", $(_this.el)[0]);
            } else {
                _this.option.nowLeft = (_this.option.moveDistance < 0) ? 0 : _this.option.maxslide;
                $(_this.el).parent().trigger("close", $(_this.el)[0]);
            }
        } else {
            if (_this.option.moveDistance != 0) {
                //打开
                if (_this.option.direction == "left")
                    _this.option.nowLeft = (_this.option.moveDistance > 0) ? -_this.option.maxslide : 0;
                else
                    _this.option.nowLeft = (_this.option.moveDistance < 0) ? _this.option.maxslide : 0;
            }else{
                if(Math.abs(_this.option.nowLeft)==_this.option.maxslide){
                    _this.option.nowLeft =0
                }
            }
        }
        _this.style(true);
    }
    NavSlide.prototype.style = function(isAnimation) {
        var _this = this;
        var time = isAnimation ? _this.option.speed : 0;
        var dict = this.option.nowLeft
        _this.el.$cont.css({
            "-webkit-transitionDuration": time + "ms",
            "-webkit-transform": "translate3d(" + dict + "px,0,0)",
            "-webkit-backface-visibility": "hidden",
            "-webkit-transitionTimingFunction": "ease-in-out",
            "transitionDuration": time + "ms",
            "transform": "translate3d(" + dict + "px,0,0)",
            "transitionTimingFunction": "ease-in-out",
        })
    }

    function Plugin(option, args) {
        return this.each(function() {
            $(this).find("li").each(function() {
                var $this = $(this)
                var data = $this.data('dt.navSlide')
                var options = $.extend({}, NavSlide.DEFAULTS, $this.data(), typeof option == 'object' && option)
                if (!data) $this.data('dt.navSlide', (data = new NavSlide(this, options)))
                if (typeof option == 'string') data[option](args)
            })
        })
    }
    var old = $.fn.navslide
    $.fn.navslide = Plugin
    $.fn.navslide.Constructor = NavSlide
        // Progress NO CONFLICT
        // =================
    $.fn.navslide.noConflict = function() {
        $.fn.navslide = old
        return this
    }

})($)

/**
 * @cname ui-switch组件
 * 初始化：$('.ui-switch').switch();
 * 事件：toggle
    $('.ui-switch').on('toggle', function(e) {
        //e.detail 为事件派发传递的参数。
        console.log(e.detail);
    })
 */
;(function() {
    var CLASS_SWITCH = 'ui-switch',
        CLASS_SWITCH_HANDLE = 'switch-handle',
        CLASS_ACTIVE = 'switch-active',
        CLASS_DRAGGING = 'switch-dragging',
        CLASS_DISABLED = 'switch-disabled',

        SELECTOR_SWITCH_HANDLE = '.' + CLASS_SWITCH_HANDLE;

    var handle = function(event, target) {
        if (target.classList && target.classList.contains(CLASS_SWITCH)) {
            return target;
        }
        return false;
    };

    //渲染
    var render = function() {
        var self = this,
            opts = self.opts || {},
            element = self.element;
        self._handle || (self._handle = element.querySelector(SELECTOR_SWITCH_HANDLE));
        opts.toggleWidth = element.offsetWidth;
        opts.handleWidth = self._handle.offsetWidth;
        opts.handleX = opts.toggleWidth - opts.handleWidth - 3;

        self.opts = opts;
    };

    //绑定事件
    var bind = function() {
        var self = this,
            opts = self.opts,
            $element = $(self.element);

        $element.on(self.touchStart, $.proxy(handleEvent, self));
        $element.on('drag', $.proxy(handleEvent, self));
        $element.on('swiperight', $.proxy(handleEvent, self));
        $element.on(self.touchEnd, $.proxy(handleEvent, self));
        $element.on('touchcancel', $.proxy(handleEvent, self));
    };


    var handleEvent = function(evt) {
        var self = this,
            opts = self.opts;

        if (self.element.classList.contains(CLASS_DISABLED)) {
            return;
        }
        switch (evt.type) {
            case 'touchstart':
            case 'mousedown':
                start.call(self, evt);
                break;
            case 'drag':
                drag.call(self, evt);
                break;
            case 'swiperight':
                swiperight.call(self, evt);
                break;
            case 'touchend':
            case 'touchcancel':
            case 'mouseup':
                end.call(self, evt);
                break;
        }
    };

    var start = function(evt) {
        var self = this,
            opts = self.opts || {};
            
        self.element.classList.add(CLASS_DRAGGING);
        if (opts.toggleWidth === 0 || opts.handleWidth === 0) { //当switch处于隐藏状态时，width为0，需要重新初始化
            render.call(self);
        }
    };
    var drag = function(evt) {
        var self = this,
            opts = self.opts || {},
            detail = evt.detail;
        if (!opts.isDragging) {
            if (detail.direction === 'left' || detail.direction === 'right') {
                opts.isDragging = true;
                opts.lastChanged = undefined;
                opts.initialState = self.element.classList.contains(CLASS_ACTIVE);
            }
        }
        if (opts.isDragging) {
            setTranslateX.call(self, detail.deltaX);
            evt.stopPropagation();
            detail.gesture.preventDefault();
        }

        self.opts = opts;
    };
    var swiperight = function(evt) {
        var self = this,
            opts = self.opts || {};
        if (opts.isDragging) {
            evt.stopPropagation();
        }
    };
    var end = function(evt) {
        var self = this,
            opts = self.opts || {},
            element = self.element;
        element.classList.remove(CLASS_DRAGGING);
        if (opts.isDragging) {
            opts.isDragging = false;
            evt.stopPropagation();
            var active = element.classList.contains(CLASS_ACTIVE);
            $.trigger(element, 'toggle', active);
        } else {
            self.toggle();
        }
    };

    var setTranslateX = $.animationFrame(function(x) {
        var self = this,
            opts = self.opts || {},
            classList = self.element.classList;
        if (!opts.isDragging) {
            return;
        }
        var isChanged = false;
        if ((opts.initialState && -x > (opts.handleX / 2)) || (!opts.initialState && x > (opts.handleX / 2))) {
            isChanged = true;
        }
        if (opts.lastChanged !== isChanged) {
            if (isChanged) {
                self._handle.style.webkitTransform = 'translate3d(' + (opts.initialState ? 0 : opts.handleX) + 'px,0,0)';
                classList[opts.initialState ? 'remove' : 'add'](CLASS_ACTIVE);
            } else {
                self._handle.style.webkitTransform = 'translate3d(' + (opts.initialState ? opts.handleX : 0) + 'px,0,0)';
                classList[opts.initialState ? 'add' : 'remove'](CLASS_ACTIVE);
            }
            opts.lastChanged = isChanged;
        }

    });

    var Switch = $.Switch = $.Class.extend({
        init: function(element, options){

            this.element = element;
            this.$element = $(element);

            render.call(this);
            bind.call(this);
        },

        toggle : function() {
            var self = this,
                opts = self.opts || {},
                classList = self.element.classList;

            if (classList.contains(CLASS_ACTIVE)) {
                classList.remove(CLASS_ACTIVE);
                self._handle.style.webkitTransform = 'translate3d(0,0,0)';
            } else {
                classList.add(CLASS_ACTIVE);
                self._handle.style.webkitTransform = 'translate3d(' + opts.handleX + 'px,0,0)';
            }
            var active = classList.contains(CLASS_ACTIVE);

            $.trigger(self.element, 'toggle', active);
            return self;
        }
    })

    Switch.DEFAULTS = {
    };
    // PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('d6.switch')

            var options = $.extend({}, Switch.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('d6.switch', (data = new Switch(this, options)))
            if (typeof option == 'string') data[option](_relatedTarget)
        })
    }

    var old = $.fn.switch

    $.fn.switch             = Plugin
    $.fn.switch.Constructor = Switch

    // NO CONFLICT
    // =================

    $.fn.switch.noConflict = function () {
        $.fn.switch = old
        return this
    }


})();
/**
 * @cname 绑定下行模板使用
 * 初始化：$('.ui-generate').generate();
 * 事件：toggle
    $('.ui-generate').on('toggle', function(e) {
        //e.detail 为事件派发传递的参数。
        console.log(e.detail);
    })
 */
;(function() {
    

    var Generate = $.Generate = $.Class.extend({
        init: function(element, options){
            var self = this;
            options.config = options.config || {};
            this.element = element;
            self.$element = $(element);
            self.method = options.config.method;
            self.tempStr = self.tempStr || self.$element.html().replace(/type=["']template["']/, '');
            self.$element.empty();
            
            self.options = options;
            self.currentPage = 0;

            if(options.refresh){
                self.bindEvent();
                self.$list = $("<div class='J_generate_list'></div>");
                self.$element.append(self.$list);
                self.$element.refresh(options.refresh);
            }

            self.update('append');
        },

        update: function(type, result, callback){
            var self = this;
            var options = self.options;
            options.data = options.data || {};
            options.data.page = {
                nowpage: type == 'prepend' ? 0 : self.currentPage //当前页
            }

            var success = function(data) {
                var nomore = data.nomore || !data.data.length;
                //提供一个接口，用户可以修改后台返回的数据
                var data = options.parse ? options.parse(data.data) : data.data;
                var tempStr = self.buildTemp(self.tempStr, data);
                var args = self.buildArgs(data);

                if(!nomore && type == "append"){
                    self.currentPage++;
                }

                var build = _.template(tempStr);
                var text = build(args);
                
                if(options.refresh){
                    self.$list[type](text);
                }else{
                    self.$element[type](text);    
                }
                callback && callback.call(self, nomore)     
            }
            if(!options.result && !result){
                $[self.method]({
                    config:options.config,
                    data: options.data,
                    success: success,
                    errors: options.errors
                })    
            }else{
                success(result || options.result)
            }
            

            /*var data = {
                "result": 0,
                "nomore" : false,
                "data": [{
                    "id": 0,
                    "name": "update",
                    "des" : "<h1>des描述</h1>",
                    "notes": "你好案说法6666",
                    "imgurl" : "img/1.jpg",
                    "time" : $.formatDateToString(new Date())

                }, {
                    "id": 0,
                    "name": "李颖",
                    "notes": "噶发",
                    "imgurl" : "img/2.jpg"
                }]
            }
            var nomore = data.nomore;
            var data = data.data;
            var tempStr = self.buildTemp(self.tempStr, data);
            var args = self.buildArgs(data);

            if(!nomore && type == "append"){
                self.currentPage++;
            }

            var build = _.template(tempStr);
            var text = build(args);
            
            if(options.refresh){
                self.$list[type](text);
            }else{
                self.$element[type](text);    
            }
            callback && callback.call(self, nomore || !data.length)*/
        },
        //获取下一页数据
        next: function(callback){
            var self = this;
            self.update('append', null, callback);
        },
        //刷新列表，在列表前面追加最新数据
        refresh: function(callback){
            var self = this;
            self.update('prepend', null, callback);
        },

        //绑定下拉刷新组件的下拉和上拉事件
        bindEvent: function(){
            var self = this;
            self.$element.on('pullup', function(e, refresh){
                self.update('append', function(nomore){
                    refresh.endPullupToRefresh(nomore)
                });
            })
            self.$element.on('pulldown', function(e, refresh){
                self.update('prepend', function(nomore){
                    refresh.endPulldownToRefresh(nomore)    
                });
            })
        },

        strToJson: function(str){
            var self = this;
            if(!/\w+:\w+/.test(str)){
                return {};
            }
            var newStr = str.replace(/\s+/, "").replace(/([:,]){1}/g, "\"$1\"");
            return $.parseJSON("{\"" + newStr + "\"}"); 
            
        },

        buildArgs: function(args){
            if($.isPlainObject(args)){
                pre = end = "";
                args = {
                    item : args
                };
            }else if($.isArray(args)){
                args = {
                    list : args
                }
            }
            return args;
        },


        buildTemp : function(tempStr, args){
            var self = this;
            var pre = "<% $.each(list, function(index, item){ %>";
            var end = "<% }) %>";

            $.isPlainObject(args) && (pre = end = "")

            var $temp = $("<div>" + tempStr + "</div>");  //这句对dom结构有要求，必须是个单节点，多节点的话，只能匹配一个

            $temp.find('[ng-model]').map(function(index, item){
                
                var $item = $(item);
                var key = $item.attr("ng-model");
                var config = self.strToJson(key);

                config._html = ( $item.attr("ng-html") || config._html );

                if(config.content){
                    (config._html == "true") ? 
                        ($item.html("<%-item."+ config.content +"%>")) : 
                        ($item.html("<%=item."+ config.content +"%>"))
                }
                
                if(config.src){
                    $item.attr("src", "<%=item."+ config.src + "%>" );
                } 

                if(config.href){
                    $item.attr("href","<%=item."+ config.href + "%>");
                }

                if(config.value){
                    $item.attr("value","<%=item."+ config.value + "%>");
                }
            })
            return pre + $temp.html().replace(/&lt;%/g, "<%").replace(/%&gt;/g, "%>") + end;
        }    
    })

    Generate.DEFAULTS = {
    };
    // PLUGIN DEFINITION
    // =======================

    function Plugin(option, _relatedTarget, args1, args2) {
        return this.each(function () {
            var $this   = $(this)
            var data    = $this.data('d6.generate')

            var options = $.extend({}, Generate.DEFAULTS, $this.data(), typeof option == 'object' && option)

            if (!data) $this.data('d6.generate', (data = new Generate(this, options)))
            if(typeof option == 'string'){ data[option](_relatedTarget, args1, args2) }
        })
    }

    var old = $.fn.generate

    $.fn.generate             = Plugin
    $.fn.generate.Constructor = Generate
    
    // NO CONFLICT
    // =================

    $.fn.generate.noConflict = function () {
        $.fn.generate = old
        return this
    }


})();


