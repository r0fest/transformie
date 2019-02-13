// addEventListener polyfill IE6+
!window.addEventListener && (function (window, document) {
  function Event(e, element) {
    var instance = this;

    for (property in e) {
      instance[property] = e[property];
    }

    instance.currentTarget =  element;
    instance.target = e.srcElement || element;
    instance.timeStamp = +new Date;

    instance.preventDefault = function () {
      e.returnValue = false;
    };
    instance.stopPropagation = function () {
      e.cancelBubble = true;
    };
  }

  function addEventListener(type, listener) {
    var
      element = this,
      listeners = element.listeners = element.listeners || [],
      index = listeners.push([listener, function (e) {
        listener.call(element, new Event(e, element));
      }]) - 1;

    element.attachEvent('on' + type, listeners[index][1]);
  }

  function removeEventListener(type, listener) {
    for (var element = this, listeners = element.listeners || [], length = listeners.length, index = 0; index < length; ++index) {
      if (listeners[index][0] === listener) {
        element.detachEvent('on' + type, listeners[index][1]);
      }
    }
  }

  window.addEventListener = document.addEventListener = addEventListener;
  window.removeEventListener = document.removeEventListener = removeEventListener;

  if ('Element' in window) {
    Element.prototype.addEventListener    = addEventListener;
    Element.prototype.removeEventListener = removeEventListener;
  } else {
    var
      head = document.getElementsByTagName('head')[0],
      style = document.createElement('style');

    head.insertBefore(style, head.firstChild);

    style.styleSheet.cssText = '*{-ms-event-prototype:expression(!this.addEventListener&&(this.addEventListener=addEventListener)&&(this.removeEventListener=removeEventListener))}';
  }
})(window, document) && scrollBy(0, 0);

(function () {
  if (!window.document.querySelectorAll) {
    document.querySelectorAll = document.body.querySelectorAll = Object.querySelectorAll = function querySelectorAllPolyfill(r, c, i, j, a) {
      var d=document,
        s=d.createStyleSheet();
      a = d.all;
      c = [];
      r = r.replace(/\[for\b/gi, '[htmlFor').split(',');
      for (i = r.length; i--;) {
        s.addRule(r[i], 'k:v');
        for (j = a.length; j--;) {
          a[j].currentStyle.k && c.push(a[j]);
        }
        s.removeRule(0);
      }
      return c;
    };
  }
})();


var Transformie = {
	
	defaults: {
		inlineCSS: '*',
		stylesheets: true,
		track: '*',
		centerOrigin: 'margin' //false, position
	},
	
	toRadian: function(value) {
		if(value.indexOf("deg") != -1) {
			return parseFloat(value,10) * (Math.PI * 2 / 360);
		} else if (value.indexOf("grad") != -1) {
			return parseFloat(value,10) * (Math.PI/200);
		} else {
			return parseFloat(value,10);
		}
	},
	
	getTransformValue: function(style) {
		return style['-webkit-transform']
		|| 	style['webkit-transform'] 
		|| 	style['transform']
		|| 	style.webkitTransform
		||	style['-moz-transform']
		|| 	style['moz-transform'] 
		|| 	style.MozTransform
		|| 	style.mozTransform;
	},
	
	track: function(query) {
		var el = document.querySelectorAll(query);

    el.removeEventListener('propertychange');
    el.addEventListener('propertychange', function(e) {
      if(e.originalEvent.propertyName == 'style.webkitTransform' || e.originalEvent.propertyName == 'style.MozTransform' || e.originalEvent.propertyName == 'style.transform')
        Transformie.applyMatrixToElement(Transformie.computeMatrix(Transformie.getTransformValue(this.style)), this);
    });
	},
	
	apply: function(selector) {
    var el = document.querySelectorAll(selector);

    for (var i = 0; i < el.length; i++) {
      var foundRule = Transformie.getTransformValue(el[i].style);
      foundRule && Transformie.applyMatrixToElement(Transformie.computeMatrix(foundRule), el[i]);
    }
	},
	
	parseStylesheets: function() {	
		//Loop through all stylesheets and apply initial rules
		for (var i=0; i < document.styleSheets.length; i++) {
			if(document.styleSheets[i].readOnly) continue; // if the stylesheet gives us security issues and is readOnly, exit here
			for (var j=0; j < document.styleSheets[i].rules.length; j++) {
				var foundRule = Transformie.getTransformValue(document.styleSheets[i].rules[j].style);
				foundRule && Transformie.applyMatrixToSelector(Transformie.computeMatrix(foundRule), document.styleSheets[i].rules[j].selectorText);
			};
		};	
		
	},
	
	applyMatrixToSelector: function(matrix, selector) {

		//TODO: Figure what to do with :hover, can't just apply it to found elements
		if(selector.indexOf && selector.indexOf(':hover') != -1)
			return;

    var el = document.querySelectorAll(selector);

    for (var i = 0; i < el.length; i++) {
      Transformie.applyMatrixToElement(matrix, el[i]);
    }

	},
	
	applyMatrixToElement: function(matrix, element) {
		
		if(!element.filters["DXImageTransform.Microsoft.Matrix"]) {
			element.style.filter = (element.style.filter ? '' : ' ' ) + "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand')";
			Transformie.track(element); // if an element is being tracked once, it is likely we do something with it later on, so track changes on this one by default
		}

		element.filters["DXImageTransform.Microsoft.Matrix"].M11 = matrix.elements[0][0];
		element.filters["DXImageTransform.Microsoft.Matrix"].M12 = matrix.elements[0][1];
		element.filters["DXImageTransform.Microsoft.Matrix"].M21 = matrix.elements[1][0];
		element.filters["DXImageTransform.Microsoft.Matrix"].M22 = matrix.elements[1][1];
		
		// Since we unfortunately do not have the possibility to use Dx,Dy with sizing method 'auto expand', we need to do
		// something hacky to work around supporting the transform-origin property, either modifying top/left or margins.
		// IE Team: Would be really helpful if you could fix this to work on auto expand, or introduce a sizing method that works like the default, but doesn't clip..
		if(Transformie.defaults.centerOrigin) { //TODO: Add computed borders here to clientWidth/height or find a better prop to look for
			element.style[Transformie.defaults.centerOrigin == 'margin' ? 'marginLeft' : 'left'] = -(element.offsetWidth/2) + (element.clientWidth/2) + "px";
			element.style[Transformie.defaults.centerOrigin == 'margin' ? 'marginTop' : 'top'] = -(element.offsetHeight/2) + (element.clientHeight/2) + "px";
		}
		
	},
	
	computeMatrix: function(ruleValue) {
	
		//Split the webkit functions and loop through them
		var functions = ruleValue.match(/[A-z]+\([^\)]+/g) || [];
		var matrices = [];
		
		for (var k=0; k < functions.length; k++) {
		
			//Prepare the function name and its value
			var func = functions[k].split('(')[0],
				value = functions[k].split('(')[1];
		
			//Now we rotate through the functions and add it to our matrix
			switch(func) {
				case 'matrix': //Attention: Matrix in IE doesn't support e,f = tx,ty = translation
					var values = value.split(',');
					matrices.push($M([
						[values[0],	values[2],	0],
						[values[1],	values[3],	0],
						[0,					0,	1]
					]));
					break;
				case 'rotate':
					var a = Transformie.toRadian(value);
					matrices.push($M([
						[Math.cos(a),	-Math.sin(a),	0],
						[Math.sin(a),	Math.cos(a),	0],
						[0,				0,				1]
					]));
					break;
				case 'scale':
					matrices.push($M([
						[value,	0,		0],
						[0,		value,	0],
						[0,		0,		1]
					]));
					break;
				case 'scaleX':
					matrices.push($M([
						[value,	0,		0],
						[0,		1,		0],
						[0,		0,		1]
					]));
					break;
				case 'scaleY':
					matrices.push($M([
						[1,		0,		0],
						[0,		value,	0],
						[0,		0,		1]
					]));
					break;
				case 'skew':
					var a = Transformie.toRadian(value);
					matrices.push($M([
						[1,				0,	0],
						[Math.tan(a),	1,	0],
						[0,				0,	1]
					]));
				case 'skewX':
					var a = Transformie.toRadian(value);
					matrices.push($M([
						[1,		Math.tan(a),0],
						[0,		1,			0],
						[0,		0,			1]
					]));
					break;
				case 'skewY':
					var a = Transformie.toRadian(value);
					matrices.push($M([
						[1,				0,	0],
						[Math.tan(a),	1,	0],
						[0,				0,	1]
					]));
					break;
			};
			
		};
		
		if(!matrices.length)
			return;
		
		//Calculate the resulting matrix
		var matrix = matrices[0];
		for (var k=0; k < matrices.length; k++) {
			if(matrices[k+1]) matrix = matrix.x(matrices[k+1]);
		};

		return matrix;
		
	}	
};


(function() {

	if( navigator.userAgent.indexOf("MSIE ") == -1) return;

	// Parsing stylesheets, almost always makes sense
	Transformie.defaults.stylesheets && Transformie.parseStylesheets();

	// if we want to track inline CSS, we're resolving all inline transforms at page launch
	Transformie.inlineCSS && Transformie.apply(Transformie.inlineCSS === true ? '*' : Transformie.inlineCSS);
	
	// we have a dynamic site and we want to track inline style changes on a list of elements
	Transformie.defaults.track && Transformie.track(Transformie.defaults.track);
	
})();
