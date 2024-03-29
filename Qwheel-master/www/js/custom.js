

var Qwheel = {};

(function ($, Qwheel) {
var defaultMax = 200;
var defaultMin = 1;

var maxStats = 1 + 4* defaultMax;  // Set to zero for no stats
var STATE_KEY = "wheelState";
var STATS_KEY = "wheelStats";

function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var curDate = new Date().toLocaleString().replace(/:\d{2}\s/,' ');

var maxDisplay = parseInt(getParameterByName('max')) || defaultMax;
var minDisplay = parseInt(getParameterByName('min')) || defaultMin;

function saveObject(key, obj) {
   localStorage[key] = JSON.stringify(obj);
}

function deleteObject(key) {
   delete localStorage[key];
}

function getObject(key) {
   try {
      return JSON.parse(localStorage[key]);
   } catch(err) {
     return null;
   }
}

function getStats() {
   if (maxStats > 0) {
      return getObject(STATS_KEY) || resetStats();
   } else {
      deleteObject(STATS_KEY);
      return null;
   }
}

function saveStats(temObj) {
   if (!temObj)
      return;
   saveObject(STATS_KEY, temObj);
}

function setState(state) {
   saveObject(STATE_KEY, state);
}

function getState() {
   var state = getObject(STATE_KEY) || {};
   setState(state);
   return state;
}

function resetStats() {
   return {count: 0, attempts: new Uint32Array(maxStats),
                         hits: new Uint32Array(maxStats),
                     fraction: new Float32Array(maxStats)};
}

function reloadPage(newSessionID) {
   var query = newSessionID ? ('?session='+newSessionID) : ''
   if (maxDisplay != defaultMax)
      query += (query ? '&' : '?') + 'max='+maxDisplay;
   window.location = window.location.pathname+query;
}

function accumStats(temObj, key, count) {
   if (!temObj)
      return;
   if ((key in temObj.attempts)) {
      temObj.count += 1;
      temObj.hits[key] += count;
      for (var j=0; j<count; j++) {
         temObj.attempts[j] += 1;
         temObj.fraction[j] = (1.0*temObj.hits[j])/temObj.attempts[j];
      }
   }
}
function inportFiletxt(content){
   const link = document.createElement("a");
         // const content = document.querySelector("textarea").value;
         const file = new Blob([content], { type: 'text/plain' });
         link.href = URL.createObjectURL(file);
         link.download = "sample.txt";
         link.click();
         URL.revokeObjectURL(link.href);
}

var displayStats = getParameterByName('stats');
var statsObj = getStats();  
var wheelState = getState();

Qwheel.wheelReset = function () {
   deleteObject(STATE_KEY);
   reloadPage();
}

function WheelSession(sessionID) {
    this.sessionID = sessionID;
    this.curNameSpec = getParameterByName('curnames') || "";

    this.curNameStr = this.curNameSpec;
    this.sessionTime = "";
}

WheelSession.prototype.start = function () {
   
    console.log('WheelSession.start:');
    if (this.sessionID in wheelState) {
        this.sessionTitle = wheelState[this.sessionID].sessionTitle;
        this.sessionTime = wheelState[this.sessionID].time;
        if (!this.curNameSpec) 
            this.curNameStr = wheelState[this.sessionID].names;
    } else {
        this.sessionTitle = '';
    }
    if (getParameterByName('title'))
        this.sessionTitle = getParameterByName('title');

    var newNameStr = getParameterByName('names');
    if (!newNameStr && !this.curNameStr)
        showPopup(this.setupWheel.bind(this));  // Enter name list through dialog box
    else
        this.setupWheel(newNameStr);
}

WheelSession.prototype.setupWheel = function (newNameStr) {
    console.log('WheelSession.setupWheel:', newNameStr);

    if (newNameStr) {
        var temNameList;
        if (newNameStr.indexOf("\r") > 0 || newNameStr.indexOf("\n") > 0)
            temNameList = newNameStr.trim().split(/[\r\n]+/);
        else if (newNameStr.indexOf(";") > 0) 
            temNameList = newNameStr.split(";")
        else if (newNameStr.indexOf(",") > 0)
            temNameList = newNameStr.split(",");
        else
            temNameList = newNameStr.trim().split(/\s+/);
        var temNames = [];
        var dispNameDict = {};
        for (var i=0; i < temNameList.length; i++) {
            
            var temName = temNameList[i].trim();
            var dispName = temName;
            if (temName.indexOf("/") > 0) {
               var temNameComps = temName.split('/');
               temName = temNameComps[0].trim();
               dispName = temNameComps[1].trim()
            }
            if (temName) {
                temNames.push(temName);
                dispNameDict[temName] = dispName;
            }
        }
        var temNameStr = temNames.join(";");
        if (!this.curNameSpec) 
           this.curNameStr = temNameStr;
        this.sessionTime = curDate;
        wheelState[this.sessionID] = {names: this.curNameStr, allNames: temNameStr, dispNames: dispNameDict, time: this.sessionTime, sessionTitle: this.sessionTitle};
        setState(wheelState);stop

        ///if (this.curNameSpec) {
        ///    alert("Restoring session "+this.sessionID);
        ///} else if (window.confirm("Start new session "+this.sessionID )) {
        ///}
        reloadPage(this.sessionID);
    }

    this.allNameList = wheelState[this.sessionID].allNames.split(";"); 
    this.allNameObj = {};
    for (var i=0; i < this.allNameList.length; i++) {
       var name = this.allNameList[i];
       this.allNameObj[name] = wheelState[this.sessionID].dispNames[name] || name;
    }

    var nameList = this.curNameStr.split(";");
    this.curNames = [];
    for (var i=0; i < nameList.length; i++) {
        if (nameList[i] in this.allNameObj)
           this.curNames.push(nameList[i]);
    }

    showSessions(this.sessionID);
}

WheelSession.prototype.displayWheel = function () {
// Modified from https://github.com/JavoByte/rouletteWheel/demo.html 
    console.log('WheelSession.displayWheel:', this.curNames);
    if (!this.curNames || !this.curNames.length)
       return;

   //  $(document).attr('title', 'Qwheel: '+(this.sessionTitle||this.sessionId));
    $("#sessiontitle").text(this.sessionTitle);
    $("#sessiontime").text(this.sessionTime);
    $("#sessioncount").text(this.curNames.length+" of "+this.allNameList.length);
    if (displayStats) this.showStats();

    var displayRange = selectRange(this.curNames.length, maxDisplay);
    var d0 = displayRange[0];
    var d1 = displayRange[1];
    var items = {};
    for(var i=d0; i < d1; i++){
        items[i] = this.curNames[i];
    }
    if (d0 > 0 || d1 < this.curNames.length) $("#sessionrange").text(this.curNames[d0]+" - "+this.curNames[d1-1]);

    var audioElement = null;
    try { audioElement = document.createElement("audio");
          audioElement.setAttribute("src", "prize_wheel.mp3");
    } catch (err) { console.log("Error in audio:", err);
    }
   //  var soTrungThuong =  getObject("SoTrungThuong");
   //  soTrungThuong == null? soTrungThuong = "":soTrungThuong ;
    var roulettePars = {
        items : items,
        start : function() {
             try { 
                    
              audioElement.play();   
              

            } catch (err) {}
             
        },
       
        selected : function(key, value) {
          console.log("Số quay trúng:", value);
          try { audioElement.pause();
                audioElement.currentTime = 0; } catch (err) {}

          accumStats(statsObj, key, Qwheel.session.curNames.length);
          saveStats(statsObj);
          
         //  if (window.confirm("Selected: "+(Qwheel.session.allNameObj[value]||value)+".\n Remove?" )) {
         //    var newNames = [];
         //    for (var i=0; i < Qwheel.session.curNames.length; i++) {
         //      if (value != Qwheel.session.curNames[i])
         //        newNames.push(Qwheel.session.curNames[i]);
         //    }
         //    Qwheel.session.curNames = newNames;
         //    wheelState[Qwheel.session.sessionID].names = Qwheel.session.curNames.join(";");
         //    setState(wheelState);
         //    reloadPage(Qwheel.session.sessionID);
         //  }
         // const link = document.createElement("a");
         // const content = value;
         // const file = new Blob([content], { type: 'text/plain' });
         // link.href = URL.createObjectURL(file);
         // link.download = "SoTrung.txt";
         // link.click();
         // URL.revokeObjectURL(link.href);

        
         var  values  = getObject("listsotrung")
         if(values == null){
            values = [];
         }
         values.push(value);        
         localStorage.setItem("listsotrung", JSON.stringify(values));

        
         var audio = new Audio('../www/amthanhtraloidung.mp3');
         audio.play();
        
         $("#dialog-confirm").dialog({
            resizable: true,
            height: "auto",
            width: 200,
            position: [393,1512],
            title:"Quay tiếp",
            modal: true,
            buttons: {
              "OK": function() {
                $( this ).dialog( "close" );
                  var newNames = [];
                  for (var i=0; i < Qwheel.session.curNames.length; i++) {
                  if (value != Qwheel.session.curNames[i])
                     newNames.push(Qwheel.session.curNames[i]);
                  }
                  Qwheel.session.curNames = newNames;
                  wheelState[Qwheel.session.sessionID].names = Qwheel.session.curNames.join(";");
                  setState(wheelState);
                  reloadPage(Qwheel.session.sessionID);
                
              },
             
            }
          });
           
         
            // Swal.fire({
            //    title: value,
            //    text: "Xin chúc mừng "+ value+ "  đã trúng giải",             
            //    confirmButtonColor: "#00ff55",
            //    reverseButtons: true,
            
            //    }).then(function() {
            //       reloadPage(Qwheel.session.sessionID);
                  
            //   });
            
            // soTrungThuong = value;
            // reloadPage(Qwheel.session.sessionID);
        },
       
         // spinText : soTrungThuong,
        
    }
    $("#canvas").rouletteWheel(roulettePars);
}

WheelSession.prototype.wheelClear = function () {
    if (!window.confirm("Delete session "+this.sessionID+"?")) {
       return;
    }
    if (this.sessionID in wheelState) {
        delete wheelState[this.sessionID];
    }
    setState(wheelState);
    reloadPage('');
}

WheelSession.prototype.wheelRestart = function () {
   if (this.sessionID in wheelState) {
      wheelState[this.sessionID].names = wheelState[this.sessionID].allNames;
      wheelState[this.sessionID].time = curDate;
      setState(wheelState);
      reloadPage(this.sessionID);
   }
}

WheelSession.prototype.wheelExport = function () {
   var sessionID = this.sessionID;
   var query = sessionID ? ('?session='+sessionID) : ''
   if (maxDisplay != defaultMax)
      query += (query ? '&' : '?') + 'max='+maxDisplay;
   query += (query ? '&' : '?')+'names=';
   query += encodeURI(wheelState[sessionID].allNames.replace(/ /g, '+'));
   if (wheelState[sessionID].names != wheelState[sessionID].allNames) {
      query += '&curnames=';
      query += encodeURI(wheelState[sessionID].names.replace(/ /g, '+'));
   }
   $('body').text(window.location.origin+window.location.pathname+query);
}


WheelSession.prototype.showStats = function () {
   var niter = 100000;
   var temStats = resetStats();
   var maxCount = this.curNames.length;
   for (var count=minDisplay; count<=maxCount; count++) {
      var nportions = Math.ceil(count/maxDisplay);
      var portionCount = new Uint32Array(nportions);
      for (var i=0; i<niter; i++) {
         var displayRange = selectRange(count, maxDisplay);
         var isel = displayRange[0] + Math.floor(Math.random()*(displayRange[1]-displayRange[0]));
         accumStats(temStats, isel, count);
         portionCount[Math.ceil(displayRange[0]/maxDisplay)] += 1;
      }
      var nfrac = new Float32Array(nportions);
      for (var j=0; j<nportions; j++) nfrac[j] = portionCount[j]/(1.0*niter);
      console.log("portionStats: ", count, nfrac);
   }

   var output = "Test iterations = "+niter+"\n";
   for (var j=0; j<maxCount; j++) {
      output += "Test probability: "+temStats.fraction[j]+" \t"+this.curNames[j]+"\n";
   }

   if (statsObj) {
      output += "\nActual iterations = "+statsObj.count+"\n";
      for (var j=0; j<maxCount; j++) {
         output += "Actual probability of name"+(j+1)+": "+statsObj.fraction[j]+"\n";
      }
   }
  
   $("#pretext").text(output);
   console.log("showStats: ", temStats);
}


var temSessionID = getParameterByName('session') || '';
if (temSessionID == 'default')
   temSessionID = '';

var curSession = new WheelSession(temSessionID);
Qwheel.session = curSession;

if (getParameterByName('reset')) {
    Qwheel.wheelReset();
}

if (getParameterByName('clear')) {
    curSession.wheelClear();
}

if (getParameterByName('restart')) {
    curSession.wheelRestart();
}

Qwheel.readyAux = function () {
    curSession.start();
    curSession.displayWheel();
}

function showSessions(sessionID) {
    // Session menu
    $.each(wheelState, function(key, value) { 
           $('#stateSelect')
               .append($("<option></option>")
               .attr("value",key)
               .text(key?key:'Default')); 
		 });

    $('#stateSelect')
               .append($("<option></option>")
               .attr("value","NEW")
               .text("Tạo mới")); 

    $('#stateSelect').val(sessionID);

    $('#stateSelect').change(function() {
       var selState = $('#stateSelect :selected').val();
       console.log("Selected state '"+selState+"'");
       if (selState == sessionID)
           return;
       var newSessionID = '';
       if (selState == "NEW") {
           selState = window.prompt('Mời bạn nhập đợt vòng quay mới:');
           if (selState)
              newSessionID = selState.replace(/ /g,'');
        } else {
           newSessionID = selState;
        }
	reloadPage(newSessionID);
    });
		 
}

function selectRange(nitems, nportion) {
   
   // Return [startOffset, endOffset] to divide nitems into nportion parts
   // If incomplete last part is too small, the last and last-but-one
   // are combined and halved
   var startOffset = 0;
   var endOffset = nitems;
   var nparts = Math.ceil(nitems/nportion); 
   if (nparts > 1) {
      // Select subset of names to display (randomly)
      var isel = Math.floor(Math.random()*nitems); // Randomly choose an item
      var ipart = Math.floor(isel/nportion);       // Figure out which part it falls in
      var remItems = nitems % nportion; 
      if (remItems > 0 && ipart >= nparts-2) {
         // Small remainder list; last or last-but-one part
         var iselmod = isel - (nparts-2)*nportion;
         var lastButOneItems = Math.ceil( (nportion + remItems)/2 );
         var lastItems = (nportion + remItems) - lastButOneItems;
         if (iselmod < lastButOneItems) {
            startOffset = (nparts-2)*nportion;
            endOffset = startOffset + lastButOneItems;
         } else {
            startOffset = (nparts-2)*nportion+lastButOneItems;
            endOffset = startOffset + lastItems;
         }
      } else {
         startOffset = ipart*nportion;
         endOffset = startOffset + ((remItems && ipart == nparts-1) ? remItems : nportion);
      }
   }
   return [startOffset, endOffset];
}

// Popup: http://www.loginradius.com/engineering/simple-popup-tutorial/

function showPopup(submitCallback) {
    var divElem = document.getElementById('popup-container');
    var overlayElem = document.getElementById('popup-overlay');
    var contentElem = document.getElementById('popup-content');
    overlayElem.style.display = 'block';
    divElem.style.display = 'block';

   var renderdata = document.getElementById('render-number');
   renderdata.onclick = function (){
      let valNumber = window.prompt('Mời bạn nhập số lượng mảng cần random (tối đa 160):');
      let arrNumber =   Array.from(Array(parseInt(valNumber) +1).keys());
      arrNumber.shift();
      $('#popup-content').val(arrNumber);     
   }
    function closePopup() {
       overlayElem.style.display = 'none';
       divElem.style.display = 'none';
    } 
    var closeElem = document.getElementById('popup-close');
    if (closeElem)
        closeElem.onclick = closePopup;

    var submitElem = document.getElementById('popup-submit');
    submitElem.onclick = function () {
       closePopup();
       var val = contentElem.value.trim() || "alpha;beta;gamma;delta;epsilon;zeta;eta;theta;iota";
       if (submitCallback)
           submitCallback(val);
           console.log(val);
    }
}
})(jQuery, Qwheel);

$(document).ready( Qwheel.readyAux );
