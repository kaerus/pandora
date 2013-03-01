// timeout for main script
var OPEN_TIMEOUT = 5000;

var root;
try{root = global} catch(e){try {root = window} catch(e){root = this}};

(function(){

	var Promise = require('promisejs'),
		Emitter = require('emitterjs'),
		cached = {};

	Emitter(Promise.prototype);
	
	var Pandora = {
		"open": function(url,timeout) {
			return loadScript(url,timeout);
		},
		"ajax": ajax,
		"on": function(el,ev){
			var self = this;
			if(!el.on) el.on = {};
			if(!el.on[ev]) {
				el.on[ev] = new Promise;
				
				function on(event) {
					event = event ? event : window.event;
					el.on[ev].attach(on).fulfill(event);
					el.on[ev] = undefined;
				}

				try {
					addEventListener(el, ev, on); 
				} catch (error) {
					el.on[ev].reject(error);
					el.on[ev] = undefined;
				}	
			}

			return el.on[ev];
		},
		"off": function(el,ev){
			if(el.on && el.on[ev])
				removeEventListener(el, ev, el.on[ev].attached);
			return this;
		}
	};

	function ajax(method,url,options,data){
		options = options ? options : {};
	    data = data ? data : null;

		options.method = method;
		options.url = url;

		return Ajax(options,data);
	}


	var ajaxMethods = {
		"head": function(url,options){
			return ajax('head',url,options);
		},
		"get": function(url,options){
			return ajax('get',url,options);
		},
		"put": function(url,options,data){
			return ajax('put',url,options,data);
		},
		"post": function(url,options,data){
			return ajax('post',url,options,data);
		},
		"delete": function(url,options){
			return ajax('delete',url,options);
		},
		"patch": function(url,options,data){
			return ajax('patch',url,options,data);
		},
		"trace": function(url,options){
			return ajax('trace',url,options);
		},
		"connect": function(url,options){
			return ajax('connect',url,options);
		},
		"options": function(url,options){
			return ajax('options',url,options);
		}
	};	

	Object.keys(ajaxMethods).forEach(function(a){
		ajax[a] = ajaxMethods[a];
	});

	function addEventListener(elm, eType, fn){
        if(elm.addEventListener){
            elm.addEventListener(eType, fn, false);
        } else if (elm.attachEvent){
            elm.attachEvent('on' + eType, fn);
        }
    }

    function removeEventListener(elm, eType, fn){
        if(elm.removeEventListener){
            elm.removeEventListener(eType, fn, false);
        } else if (elm.detachEvent){
            elm.detachEvent('on' + eType, fn);
        }
    }   

	// clones and augments an object 
	function cloneObject(object,augment) {
	   
	   if(!augment) augment = {};

	   function Factory(properties) {
	       for(var x in properties) {
	           this[x] = properties[x];
	       }
	    }

	    Factory.prototype = object;

	    return new Factory(augment);
	}

	/* FIXME: normalize the cached path */
	function loadScript(file,timeout) {
		var loaded = cached[file];

		if(loaded) return loaded;

		loaded = cached[file] = new Promise();

		if(timeout) loaded.timeout(timeout);

	    var head = document.getElementsByTagName("head")[0];
	    var script = document.createElement("script");
	    
	    /* forces cache reload */
	    script.src = file+'?'+Date.now();
	    script.async = true;
	    script.defer = true;

	    function onloaded(event) {
	    	if(!event) event = window.event;
	    	loaded.attach(file).fulfill(event);
	    }

	    function onerror(event) {
	    	if(!event) event = window.event;
	    	loaded.attach(file).reject(event);
	    }

	    if(script.readyState) {
	    	/* IE & Opera */
	        script.onreadystatechange = function(event) {
	        	/* FIXME: IE on 404 error hell */
	            if(this.readyState === "loaded" || 
	                this.readyState === "complete") {
	                this.onreadystatechange = null;
	            	onloaded(event);
	            } else {
	            	onerror(event);
	            }	
	        }
	    } else {
	    	script.onload = onloaded;
	    	script.onerror = onerror;
	    }	

	    head.appendChild(script);

	    return loaded;
	}

	function Ajax(options,data) {
	    var res = new Promise(),
	        xhr = new XMLHttpRequest;

	    if(typeof options !== 'object') options = {url:options};
	    if(!options.async) options.async = true;
	    if(!options.method) options.method = "get";
	    if(!options.timeout) options.timeout = 5000;
	    if(!options.headers) options.headers = {};
	    if(!options.headers.accept) options.headers.accept = "application/json";

	    res.attach(xhr);

	    function parseHeaders(h) {
	    	var ret = {}, key, val, i;


	    	h.split('\n').forEach(function(header) {
	        	if((i=header.indexOf(':')) > 0) {
	        		key = header.slice(0,i).replace(/^[\s]+|[\s]+$/g,'').toLowerCase();
	        		val = header.slice(i+1,header.length).replace(/^[\s]+|[\s]+$/g,'');
	        		if(key && key.length) ret[key] = val;
	        	}	
	    	});

	    	return ret;
		}

	    xhr.onreadystatechange = function() {
	        if(xhr.readyState === 4 && xhr.status) {
	            var msg = xhr.responseText;
	    		xhr.headers = parseHeaders(xhr.getAllResponseHeaders());

	    		if(options.headers.accept.indexOf('json') >= 0)
	            	try { msg = JSON.parse(msg) } catch(err) {}

	        	if(xhr.status < 400) res.fulfill(msg);
	        	else res.reject(msg);     
	        }
	    }

	    xhr.open(options.method,options.url,options.async);
	    
	    /* set request headers */
	    Object.keys(options.headers).forEach(function(header) {
	        xhr.setRequestHeader(header,options.headers[header]);
	    });

	    /* send request */
	    xhr.send(data);

	    /* set a timeout */
	    res.timeout(options.timeout);

	    return res;
	}

	// opens Pandoras box
	Pandora.on(window,'load')
		.then(function(event){
			if(window.onready) { 
				window.onready.call(event,Pandora);
			} else {
				var main, script = document.getElementsByTagName('script');

				for(var i = 0; i < script.length; i++) {
					if((main = script[i].getAttribute('data-main'))){
						Pandora.open(main,OPEN_TIMEOUT).then(function(){
							console.log("Loaded", main);
						},function(error){
							console.log("Error loading %s:", main, error);
						});
						
						var base = dataMain.split('/');
                    	Pandora.main = base.pop();
                    	Pandora.base = base.join('/');

						break;
					}
				}
			}
			this.emit('ready',event);
		},function(error){
			this.emit('error',error);
		});

	/* FIXME: should not be necessary. */
	/* Instead pass Pandora to main(). */
	if (typeof exports === 'object') {  
        if (typeof module !== undefined && module.exports) {
            exports = module.exports = Pandora;
        } else exports.Pandora = Pandora;
    } else if (typeof define === 'function' && define.amd) {
        define(function () { return Pandora; });
    } else if(typeof root === 'object') {
        root.Pandora = Pandora; 
    } else throw "Failed to export module";
}());
