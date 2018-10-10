
var graph_colors = [30,46,28,6,7,5,4,42,41,2,3,10,49,1,33,40,37,32,29,20,21,22,23,24,25,26,27,28,29,31,32,33,34,35]; 


function checkModTime(file, callback)
{

  var req = new XMLHttpRequest(); 
  req.open("HEAD",file);
  req.send(null); 
  req.onload = function() 
  {
    if (req.status == 200) 
    {
      callback(req.getResponseHeader('Last-Modified'));
    }
    else callback(req.status); 
  }
}

function updateRunlist() 
{
  var xhr = new XMLHttpRequest() ;
  xhr.open('GET','runlist.json'); 
  xhr.onload = function() 
  {
    if (xhr.status == 200) 
    {
      json = JSON.parse(xhr.response); 
      runs = json.runs; 
      document.getElementById('last_updated').innerHTML= json.last_updated; 
    }
  }
  xhr.send() 
}


function optClear()
{
  document.getElementById('opt').innerHTML = ""; 
}

function optAppend(str)
{
  document.getElementById('opt').innerHTML += str; 
}

function hashParams(what) 
{

  var pars = {}; 
  var hash = window.location.hash.split("&"); 

  if (hash[0].substring(1) != what) return pars; 
  
  for (var i = 0; i < hash.length; i++)
  {
    var idx =hash[i].indexOf("="); 
    if (idx > 0) 
    {
      pars[hash[i].substr(0,idx)]=hash[i].substr(idx+1); 
    }
  }

  return pars; 
}




function prettyPrintHeader(vars) 
{
  str = ""; 

  str += "<table><tr>"; 
  str += "<td>Event number: " + vars["header.event_number"] +"</td>"; 
  str += "<td>Trigger number: " + vars["header.trig_number"] +"</td>"; 
  str += "<td>Readout time : " + new Date(parseInt(vars["header.readout_time"])*1000 + parseInt(vars["header.readout_time_ns"])/1e6).toISOString() +"</td>"; 
  var isRF = parseInt(vars["header.trigger_type"]) == 2; 
  str += "<tr><td>Trigger type: " + ( isRF ? "RF" : "FORCE") + "</td>"
  var triggered_beams = Math.log2(parseInt(vars["header.triggered_beams"])); 
  str += "<td>Triggered beam: " + (isRF? triggered_beams : "N/A") +"</td>"; 
  str += "<td>Triggered beam power: " + (isRF ? vars["header.beam_power"] : "N/A") + "</td>"; 
  str += "<td>Raw TrigTime: " +vars["header.trig_time"]+"</td></tr>"; 
  str += "</table> "; 
    
  return str; 

}


function plotHelp()
{
  alert("Plot Help:\nDifferent plots are separated by line returns. Different lines on same plot are separated by |||.\nAfter ;;;, you may add additional options\n\txtitle=string\n\tytitle=string\n\txtime=0|1\n\tytime=0|1\n\tlabels=label1,label2,label3,etc."); 
}

function transferHelp()
{
  alert("If checked (default), will fully download all ROOT files before making plots. Otherwise, will use partial transfers, which might be faster, but I think results in additional bandwidth and might defeat browser cache... maybe."); 
}

function arrNonZero(arr) 
{
  for (var i = 0; i < arr.length; i++)
  {
    if (arr[i]) return true; 
  }

  return false; 
}

var navg = 0; 



/** Gets the power spectrum of a TGraph, returning as a TGraph. Optionally will upsample in fourier space */ 
function spec(g, upsample=1, envelope = null) 
{

  var Y = RF.upsample(g,upsample); 
  var G = RF.makePowerSpectrum(g, Y); 

  if (envelope != null) 
  {
    RF.hilbertEnvelope(g, Y, null, envelope);
  }

  return G; 
}





var pages = {}; 

function setGraphHistStyle(histo) 
{
    histo.fXaxis.fTitleSize = 0.05; 
    histo.fYaxis.fTitleSize = 0.05; 
    histo.fXaxis.fLabelSize = 0.045; 
    histo.fYaxis.fLabelSize = 0.045; 
//    histo.fXaxis.fTitleColor = 30;
//    histo.fYaxis.fTitleColor = 30; 
//    histo.fXaxis.fLabelColor = 30;
//    histo.fYaxis.fLabelColor = 30; 
    histo.fYaxis.fAxisColor = 11; 
    histo.fXaxis.fAxisColor = 11; 
    histo.fBits = histo.fBits | JSROOT.TH1StatusBits.kNoStats;
}

function Page(name)
{
  console.log("Made new page " + name); 
  P = new Object; 
  P.main_canvas = name+"c"; 
  document.getElementById('main').innerHTML += '<div id="'+P.main_canvas+'" style="display: none" width="100%" height=100%"> </div>'; 
  P.page_name = name; 
  P.canvases = []; 
  P.graphs = [];  
  P.envs = [];  
  P.leg_graphs = [];  
  P.multigraphs = []; 
  P.legends = []; 
  P.wants = []; 
  P.labels =[]; 
  P.xtitles = []; 
  P.ytitles = []; 
  P.titles = []; 
  P.xtime = []; 
  P.ytime = []; 
  P.pstyle = []; 
//  console.log(P); 
  return P; 
}

// persist some things... 
function clearCanvases(p)
{
  for (var i = 0; i < p.canvases.length; i++) 
  {
      JSROOT.cleanup(p.canvases[i]); 
  }

  p.graphs = []; 
  p.envs = []; 
  p.leg_graphs = []; 
  p.wants = [];  
  p.multigraphs = []; 
  p.xtitles = []; 
  p.ytitles = []; 
  p.xtime = []; 
  p.ytime = []; 
  p.labels = []; 
  p.pstyle = []; 
  p.legends = []; 
  p.titles = []; 

//  p.canvases =[]; 
//  var c = document.getElementById(p.main_canvas); 
//  c.innerHTML = ""; 
}

function addCanvas(P,cl='canvas',show_name = true) 
{
  var i = P.canvases.length+1; 
  var name = P.page_name+"_c" + i; 
  var c = document.getElementById(P.main_canvas); 
  var show = show_name ? name : ''; 
  c.innerHTML += '<div class="'+cl+'" id="' + name + '">'+show+'</div>'; 
  P.canvases.push(name); 
  return name; 
}



function startLoading(str = "Loading...") 
{
  document.getElementById("load").innerHTML = str; 
}
function appendLoading(str) 
{
  document.getElementById("load").innerHTML += str; 
}

function stopLoading() 
{
  document.getElementById("load").innerHTML = ""; 
}



function makeLegend(xlow,xhigh,ylow,yhigh, objs) 
{
      var leg = JSROOT.Create("TLegend"); 
      leg.fName="legend";
      leg.fTitle="Legend"; 
      leg.fX1NDC = xlow;
      leg.fX2NDC = xhigh; 
      leg.fY1NDC = ylow;
      leg.fY2NDC = yhigh; 
      leg.fFillStyle=1001; 
      leg.fFillColor=14; 
      leg.fNColumns = objs.length > 12 ? 4 : objs.length > 8 ? 3 : objs.length > 3 ? 2 : 1; 
 
      for (var i = 0; i < objs.length; i++) 
      {
        var entry = JSROOT.Create("TLegendEntry"); 
        entry.fObject=objs[i]; 
        entry.fLabel=objs[i].fTitle; 
        entry.fOption="l"; 
        leg.fPrimitives.arr.push(entry); 
      }
     
      return leg; 

}


function doDraw(page, ts, what,cut) 
{

  clearCanvases(page); 
  var plots = document.getElementById(what).value.split("\n"); 

  //clear out any null trees 
  var real_ts = []; 
  for (var it = 0; it < ts.length; it++)
  {
    if (ts[it] != null && ts[it].fEntries > 0) real_ts.push(ts[it]); 
  }


  for (var i = 0; i < plots.length; i++) 
  {
    //see if we have titles and time displays
    
    var these_plots = plots[i].split(";;;"); 



    var draws = these_plots[0].split("|||"); 
    var this_xtitle = ""; 
    var this_ytitle = ""; 
    var this_label = []; 
    var this_xtime = false; 
    var this_ytime = false; 
    var this_pstyle = "lp"; 
    var this_title = "Plot "+i; 

    if (these_plots.length > 1) 
    {

      var kvs = these_plots[1].split(";"); 
      for (var k = 0; k < kvs.length; k++)
      {
        var kv = kvs[k].split(":"); 

        if (kv[0].trim()==="xtitle")
        {
          this_xtitle = kv[1].trim(); 
        }
        if (kv[0].trim()==="title")
        {
          this_title = kv[1].trim(); 
        }
 
        if (kv[0].trim()==="ytitle")
        {
          this_ytitle = kv[1].trim(); 
        }
        if (kv[0].trim()==="labels")
        {
          this_label = kv[1].trim().split(","); 
        }
        if (kv[0].trim()==="xtime")
        {
          this_xtime = parseInt(kv[1].trim()); 
        }
        if (kv[0].trim()==="ytime")
        {
          this_ytime = parseInt(kv[1].trim()); 
        }
        if (kv[0].trim()==="opt")
        {
          this_pstyle = kv[1].trim(); 
        }
      }

    }

    page.xtitles.push(this_xtitle); 
    page.titles.push(this_title); 
    page.ytitles.push(this_ytitle); 
    page.labels.push(this_label); 
    page.xtime.push(this_xtime); 
    page.ytime.push(this_ytime); 
    page.pstyle.push(this_pstyle); 


    page.graphs.push([]); 
    page.leg_graphs.push([]); 
    if (page.canvases.length <= i) addCanvas(page); 
    var howmanytrees = 0; 
    var min_tt = ts.length -1; 

    page.wants.push(draws.length*real_ts.length); 

    for (var j = 0; j < draws.length; j++) 
    {
      for (var it = 0; it < real_ts.length; it++)
      {

        args = { expr: draws[j], cut: cut, graph: true, drawopt: [i,j,it]}; 
        real_ts[it].Draw(args, function(g,indices,ignore)
        {
          var ii = indices[0]; 
          var jj = indices[1]; 
          var tt = indices[2]; 

          if (g.fNpoints == 0) 
          {
            page.wants[ii]--; 
            return;
          }
          g.InvertBit(JSROOT.BIT(18)); 
          g.fTitle = page.labels[ii][jj]; 
          g.fName = page.labels[ii][jj]; 
          g.fLineColor = graph_colors[jj]; 
          g.fMarkerColor = graph_colors[jj]; 
          g.fFillColor = graph_colors[jj]; 
          page.graphs[ii].push(g); 
          if (tt == 0) 
          {
            page.leg_graphs[ii].push(g); 
          }
          if (page.graphs[ii].length == page.wants[ii]) 
          {
            var mg = JSROOT.CreateTMultiGraph.apply(0,page.graphs[ii]); 
            mg.fTitle = page.titles[ii]; 
            JSROOT.draw(page.canvases[ii],mg,"A" +page.pstyle[ii], function (painter) 
              {
                var hist = painter.firstpainter.GetHisto(); 
                hist.fXaxis.fTitle=page.xtitles[ii]; 
                hist.fYaxis.fTitle=page.ytitles[ii]; 
                if (page.xtime[ii])
                {
                  hist.fXaxis.fTitle += " (start = " + new Date(hist.fXaxis.fXmin*1000.).toISOString() + ")"; 
                }
                if (page.ytime[ii])
                {
                  hist.fYaxis.fTitle += " (start = " + new Date(hist.fYaxis.fXmin*1000.).toISOString() + ")"; 
                }
 
                var date = new Date(Date.now()); 
                hist.fYaxis.fTimeDisplay=page.ytime[ii]; 
                hist.fXaxis.fTimeDisplay=page.xtime[ii]; 
                hist.fYaxis.fTimeFormat="%F1970-01-01 " +date.getTimezoneOffset()/60 +":00:00s0" ;
                hist.fXaxis.fTimeFormat="%F1970-01-01 " +date.getTimezoneOffset()/60 +":00:00s0" ;
                JSROOT.redraw(painter.divid,hist,"", function (painter) 
                  {
                    if (page.labels[ii].length)
                    {
                      var leg = makeLegend(0.7,1,0.9,1,page.leg_graphs[ii]); 
                      JSROOT.draw(painter.divid,leg);
                      page.legends.push(leg); 
                    }
                  }); 
              }
            ); 
            page.multigraphs.push(mg); 
          }
        }); 
      }
    }
  }
}


function statusTreeDraw()
{
  var cut = document.getElementById('status_cut').value; 
  var run0 = parseInt(document.getElementById('status_start_run').value); 
  var run1 = parseInt(document.getElementById('status_end_run').value); 

  var decimated = document.getElementById('status_use_decimated').checked ? ".decimated" : "" 
  window.location.hash = "status&run0=" + run0 + "&run1=" + run1; 

  var status_trees = []; 

  startLoading("[Loading status files... be patient if you asked for a lot of runs]"); 

  var suffix = document.getElementById('status_full_transfers').checked ? "+" : ""; 
  var files_to_load = [];

  for (var r = run0; r <= run1; r++)
  {
    files_to_load.push("rootdata/run"+r+"/status"+decimated+".root"+suffix); 
  }

  console.log(files_to_load); 

  for (var i = 0; i < files_to_load.length; i++)
  {
    JSROOT.OpenFile(files_to_load[i], function(file)
    {  
       appendLoading("="); 
       if (file == null)
       { 
         status_trees.push(null); 
         appendLoading("+"); 
         if (status_trees.length == files_to_load.length) 
         {
            stopLoading(); 
            doDraw(pages['status'],status_trees,'plot_status',cut); 
         }
 
         return; 
       }

       file.ReadObject("status;1", function(tree) 
       {
          status_trees.push(tree); 
          appendLoading("+"); 
          if (status_trees.length == files_to_load.length) 
          {
             stopLoading(); 
             doDraw(pages['status'],status_trees,'plot_status',cut); 
          }
       }); 
    }) ; 
  }
}


function hkTreeDraw() 
{
  var cut = document.getElementById('hk_cut').value; 
  if (cut != "") cut+= "&&"; 
  var t0 = new Date(document.getElementById('hk_start_time').value); 
  var t1 = new Date(document.getElementById('hk_end_time').value); 
  var t2 = new Date(t1.getTime() + 24* 3600 * 1000); 
  cut += "(hk.unixTime>" + t0.getTime()/1000 + "&&hk.unixTime<" + t1.getTime()/1000 + ")"; 

  window.location.hash = "hk&t0=" + t0.getTime() + "&t1=" + t1.getTime(); 

  //figure out what days we need 

  var hktrees = []; 

  var suffix = document.getElementById('hk_full_transfers').checked ? "+" : ""; 
  startLoading("[Loading hk files]"); 
  var files_to_load = []; 
  for (var d = new Date(t0); d<= t2; d.setDate(d.getDate()+1)) 
  {
    var mon = d.getUTCMonth()+1; 
    var day = d.getUTCDate(); 
    if (mon < 10) mon = "0" + mon; 
    if (day < 10) day = "0" + day; 
    files_to_load.push("rootdata/hk/" + d.getUTCFullYear()  + "/" + mon + "/" + day+ ".root"+suffix); 
  }
  console.log(files_to_load); 

  for (var i = 0; i < files_to_load.length; i++)
  {

    JSROOT.OpenFile(files_to_load[i], function(file)
    { 
       appendLoading("="); 
       if (file == null)
       { 
         hktrees.push(null); 
         appendLoading("+"); 
         if (hktrees.length == files_to_load.length) 
         {
             stopLoading(); 
             doDraw(pages['hk'],hktrees,'plot_hk',cut); 
         }

         return; 
       }
       file.ReadObject("hk;1", function(tree) 
       {
       appendLoading("+"); 
          hktrees.push(tree); 
          if (hktrees.length == files_to_load.length) 
          {
             stopLoading(); 
             doDraw(pages['hk'],hktrees,'plot_hk',cut); 
          }
       }); 
    }) ; 
  }
}



function hk() 
{

  optAppend("Start Time: <input id='hk_start_time' size=30> ");
  optAppend("Stop Time: <input id='hk_end_time' size=30> " ); 
  optAppend("Cut: <input id='hk_cut' size=20 value='Entry$%10==0'>");
  optAppend(" | Full xfers(<a href='javascript:transferHelp()'>?</a>) : <input type=checkbox id='hk_full_transfers' checked> <br>" ); 
  optAppend("Plot(<a onClick='return plotHelp()'>?</a>):<br>");
  optAppend("<textarea id='plot_hk' cols=160 rows=5>hk.unixTime:hk.temp_board|||hk.unixTime:hk.temp_adc;;;xtitle:time;title:Temperatures;ytitle:C;xtime:1;labels:board,adc\nhk.unixTime:hk.frontend_current|||hk.unixTime:hk.adc_current|||hk.unixTime:hk.aux_current|||hk.unixTime:hk.ant_current;;;xtitle:time;ytitle:mA;labels:frontend,adc,aux,ant;xtime:1;title:currents\nhk.unixTime:hk.disk_space_kB;;;title:disk;xtitle:time;xtime:1;labels:disk;ytitle:kB</textarea>");
  optAppend("<br><input type='button' onClick='return hkTreeDraw()' value='Draw'>"); 
  optAppend("<a href='all_hk.root'>  (Download All HK ROOT File)</a>"); 
  
  var now = Date.now(); 

  var hash_params = hashParams('hk'); 

  document.getElementById('hk_start_time').value = new Date( hash_params['t0'] === undefined ? Date.now()- 7*24*3600*1000 : parseInt(hash_params['t0'])).toISOString(); 
  document.getElementById('hk_end_time').value = new Date(hash_params['t1'] === undefined ? Date.now() : parseInt(hash_params['t1'])).toISOString(); 

  hkTreeDraw(); 

} 

the_ffts = [];

ngraphs = 0; 
max_graphs = 8; 
last_run = -1; 
last_hd_tree = null; 
last_ev_tree = null; 
last_hd_modified= 0; 
last_ev_modified = 0; 


hd_canvas = null;
graph_canvases = []; 
fft_canvas = null;

//interferometry canvases 
int_canvas_h = null ; 
int_canvas_v = null;


boresight = [1,0,0]; 
max_phi = 180; 
max_theta = 90.0; 

antennas = [
  RF.Antenna( 0,0,0, boresight[0],boresight[1],boresight[2], max_phi, max_theta)
, RF.Antenna( -6.039,-1.618,2.275, boresight[0],boresight[1],boresight[2], max_phi, max_theta)
, RF.Antenna( -1.272,-10.364,1.282, boresight[0],boresight[1],boresight[2], max_phi, max_theta)
, RF.Antenna( 3.411,-11.897,-0.432, boresight[0],boresight[1],boresight[2], max_phi, max_theta)
 ]; 

mapper = RF.AngleMapper(antennas); 

h_map = new RF.InterferometricMap(120,-180,180,60,-90,90, mapper); 
v_map = new RF.InterferometricMap(120,-180,180,60,-90,90, mapper); 

first_int = true; 

function go(i) 
{
  var P = pages['event']; 
   
  if (i < 0)
  {
    i = parseInt(document.getElementById('evt_entry').value); 
  }
  else
  {
    document.getElementById('evt_entry').value = i; 
  }

  var run = parseInt(document.getElementById('evt_run').value); 

  if (runs.indexOf(run) < 0) 
  {
    alert("No run " + run); 
    return; 
  }

  window.location.hash = "event&run=" + run + "&entry=" + i; 

  var event_file = "rootdata/run" + run + "/event.root"; 
  var load_div = document.getElementById('load'); 
  load_div.innerHTML = '<a href="'+event_file+'">Event File</a>'; 
  var head_file = "rootdata/run" + run + "/header.root"; 
  load_div.innerHTML += ' | <a href="'+head_file+'">Head File</a>'; 
  var status_file = "rootdata/run" + run + "/status.root"; 
  load_div.innerHTML += ' | <a href="'+status_file+'">Status File</a>'; 
  load_div.innerHTML += ' | <a id="dl_link" href="data:text/csv;charset=utf-8">Event CSV</a> '

  var dl_link = document.getElementById("dl_link"); 

  csvContent = "data:text/csv;charset=utf-8,"; 

  ngraphs =0; 
  if (run!=last_run) 
  {
    last_hd_tree = null;
    last_ev_tree = null;
    last_hd_modified = "";
    last_ev_modified = "";
    last_run = run; 
  }


  /* Set up the canvases */ 


  if (P.canvases.length < 1) 
  {
    hd_canvas = addCanvas(P,"canvas_short",false); 
  }

  hd_canvas = P.canvases[0]; 


  for (var ii = 0; ii < max_graphs; ii++) 
  {
    if (P.canvases.length < ii+2) 
    {
      addCanvas(P, "canvas_small",false); 
    }
    graph_canvases[ii] = P.canvases[ii+1]; 
  }



  var int_h_index = graph_canvases.length+1;
  var int_v_index = graph_canvases.length+2;

  if (P.canvases.length < int_h_index+1) 
  {
    addCanvas(P,"canvas_small",false); 
    first_int = true;
  }

  if (P.canvases.length < int_v_index+1) 
  {
    addCanvas(P,"canvas_small",false); 
  }


  int_canvas_h = P.canvases[int_h_index]; 
  int_canvas_v = P.canvases[int_v_index]; 


  var fft_index = graph_canvases.length +3;

  if (P.canvases.length < fft_index+1) 
  {
    addCanvas(P,"canvas_med",false); 
  }

  fft_canvas = P.canvases[fft_index]; 


  // set up the interferometer


  //closure for processing header tree
    head_proc = function(tree) 
    {
        if (tree.fEntries <= i) 
        {
          i = tree.fEntries-1; 
          document.getElementById('evt_entry').value = i; 
          pause(); 
        }

        last_hd_tree = tree; 

        dl_link.setAttribute("download",run+"_"+i+".csv"); 


        var sel = new JSROOT.TSelector(); 

        var header_vars = ["event_number","trig_number","buffer_length","pretrigger_samples","readout_time", "readout_time_ns", "trig_time","raw_approx_trigger_time","raw_approx_trigger_time_nsecs","triggered_beams","beam_power","buffer_number","gate_flag","trigger_type","sync_problem"]; 
        for (var b = 0; b < header_vars.length; b++) 
        {
          sel.AddBranch("header."+header_vars[b]);     
        }
        

        sel.Begin = function ()
        {
        }

        sel.Process = function ()
        { 
          var hdrc = document.getElementById(hd_canvas); 

          /*
          var str = ""; 
          //todo, format nicer 
          
          str += "<table>"; 
          for (var b = 0; b < header_vars.length; b++) 
          {
            if ( b % 3 == 0) str += "<tr>"; 
            str += "<td>"+ header_vars[b] + ": </td> <td> " + this.tgtobj["header."+header_vars[b]] + "</td>"; 
            if ( b % 3 == 2) str += "</tr>"; 
          }
          str += "</table>"; 
          */
          hdrc.innerHTML = prettyPrintHeader(this.tgtobj);  
        }; 

        sel.Terminate = function(res) { ; } 

        var args = { numentries: 1, firstentry : i} ;
        tree.Process(sel, args); 
      }

    checkModTime(head_file, function(time)
        {
          if (last_hd_tree && time == last_hd_modified) 
          {
            head_proc(last_hd_tree); 
          }
          else
          {
            last_hd_modified=time; 
            JSROOT.OpenFile(head_file, function(file)  
            {
              if (file == null) 
              { 
                alert("Could not open event file!"); 
                return; 
              }

              file.ReadObject("header", head_proc); 

            }); 
          }

        });



    ev_proc = function(tree) 
    {
      last_ev_tree = tree;
      if (tree.fEntries <= i) 
      {
        i = tree.fEntries-1; 
        document.getElementById('evt_entry').value = i; 
        pause(); 
      }

      var sel = new JSROOT.TSelector(); 

      sel.AddBranch("event.event_number"); 
      sel.AddBranch("event.raw_data"); 
      sel.AddBranch("event.buffer_length"); 

      sel.Begin = function (){ }  ; 
      sel.Process = function ()
      { 
        var data = this.tgtobj['event.raw_data']; 
        var ev = this.tgtobj['event.event_number']; 
        var N = this.tgtobj['event.buffer_length']; 

        var X = []; 
        var ii = 0; 
        for (var x = 0; x < N; x++) { X.push(x*2) }; 
        var do_fft = document.getElementById('evt_fft').checked; 
        var do_envelope = document.getElementById('evt_hilbert').checked; 
        var do_measure = document.getElementById('evt_measure').checked; 
        var do_avg = document.getElementById('avg_fft').checked; 
        var upsample = document.getElementById('upsample').value; 
        var autoscale = document.getElementById('evt_autoscale').checked; 

        for (var ch = 0; ch < data.length; ch++)
        {
          if (!arrNonZero(data[ch])) continue; 

          var c = graph_canvases[ii]; 

          if (P.graphs.length > ii) JSROOT.cleanup(c); //not our first rodeo 

          ngraphs++; 

          var g= JSROOT.CreateTGraph(N, X, data[ch]); 

          for (var y = 0; y < N; y++) { g.fY[y]-=64; } 

          if (document.getElementById('filt').checked) 
          {
            var As = document.getElementById('filt_A').value.split(','); 
            var Bs = document.getElementById('filt_B').value.split(','); 

            var a = []; 
            var b = [];

            for (var jj =0; jj < As.length; jj++) 
            {
              a[jj] = parseFloat(As[jj]) 
            }
            for (var jj =0; jj < Bs.length; jj++) 
            {
              b[jj] = parseFloat(Bs[jj]) 
            }

            RF.IIRFilter(g,b,a); 

          }

          g.fTitle = " Evt" + ev + ", CH " + ch; 
          g.fLineColor = graph_colors[0]; 
          g.fMarkerColor = graph_colors[0]; 
          g.InvertBit(JSROOT.BIT(18)); 
          g.fName="g_c"+ch; 

          env = null; 

          if (do_envelope && do_fft) 
          {
            env = JSROOT.CreateTGraph(0,[],[]); 
            env.fLineColor = graph_colors[4]; 
            env.fMarkerColor = graph_colors[4]; 
            env.fTitle = "Envelope" 
            env.fName = "envelope" 
          }

          P.graphs[ch]=g; 
          P.envs[ch]=env; 

          if (do_measure)
          {
            var sum = 0; 
            var sum2 = 0; 

          }

          if (do_fft) 
          {
            var fft =  spec(g,upsample, do_envelope ? env : null); 
            if (do_avg && navg > 0) 
            {
               if (ii ==0) navg++; 

               for (var ff = 0; ff < the_ffts[ii].fNpoints; ff++)
               {
                 the_ffts[ii].fY[ff] =  10 * Math.log10((Math.pow(10, the_ffts[ii].fY[ff]/10) * (navg-1) + Math.pow(10, fft.fY[ff]/10)) / (navg)); 
               }

            }
            else
            {
              navg = do_avg ? 1 : 0; 
              the_ffts[ii] =fft; 
              the_ffts[ii].fLineColor = graph_colors[ii]; 
              the_ffts[ii].fMarkerColor = graph_colors[ii]; 
            }
          }

          csvContent += g.fY.join(",") + "\r\n"

          var min=9999; 
          var max=-9999; 
          var sum2 = 0; 
          var sum = 0;

          if (autoscale || do_measure) 
          {
            for (var y = 0; y < g.fY.length; y++) 
            {
                if (g.fY[y] < min) min = g.fY[y]; 
                if (g.fY[y] > max) max = g.fY[y]; 

                if (do_measure)
                {
                  sum2 += g.fY[y]*g.fY[y]; 
                  sum += g.fY[y]; 
                }
            }

          }
          var delta = max-min;
          var pave = null; 

          if (do_measure) 
          {
            var avg = sum / g.fNpoints; 
            var rms = Math.sqrt(sum2 / g.fNpoints - avg * avg); 

            pave =  JSROOT.Create("TPaveText"); 
            pave.fTitle="measurements"; 
            pave.fName="measure"; 
            pave.fLineStyle = 0; 
            pave.fTextSize = 12; 
            pave.fX1NDC=0.1; 
            pave.fX2NDC=0.9; 
            pave.fY1NDC=0.1; 
            pave.fY2NDC=0.3; 
            pave.AddText("max: " + max.toFixed(3) + "  min: " + min.toFixed(3) + "  Vpp: " + delta.toFixed(3)); 
            pave.AddText("avg: " + avg.toFixed(3) + "  rms: " + rms.toFixed(3)); 
            pave.fLines.arr[0].fTextColor = 5; 
            pave.fLines.arr[1].fTextColor = 5; 
            P.legends[ii] = pave; 
          }


          if (!autoscale)
          {
            var range = parseInt(document.getElementById('evt_zoom').value); 
            min= -range; 
            max= range; 
          }
          else
          {
            max +=0.1*delta; 
            min -=0.1*delta;
          }

          var histo = JSROOT.CreateHistogram("TH1I",100); 
          histo.fName = g.fName + "_h";
          histo.fTitle = g.fTitle;
          histo.fXaxis.fXmin = 0;
          histo.fXaxis.fXmax = N*2;;
          histo.fYaxis.fXmin = min;
          histo.fYaxis.fXmax = max;
          histo.fMinimum = min;
          histo.fMaximum = max;
          histo.fXaxis.fTitle = "ns"; 
          histo.fYaxis.fTitle = "adu"; 
          setGraphHistStyle(histo); 
          
          g.fHistogram = histo; 

          JSROOT.draw(c,g,"AL", function(painter)
              {
                var hist = painter.GetObject().fHistogram; 
                painter.root_pad().fGridx = 1; 
                painter.root_pad().fGridy = 1; 
                var tpainter = painter.FindPainterFor(null,"title"); 
                var pavetext = tpainter.GetObject(); 
//                pavetext.fTextColor = 31; 

                tpainter.Redraw(); 
                JSROOT.redraw(painter.divid, hist, ""); 
              }); 

          if (do_envelope && do_fft) 
          {
            JSROOT.draw(c,env, "LSAME"); 
          }

          if (do_measure) 
          {
            JSROOT.draw(c,pave,"SAME"); 
          }

          ii++; 
        }
      }; 

      sel.Terminate = function(res) 
      { 
        /* hide any extra channels */ 

        for (var ii = ngraphs; ngraphs < graph_canvases.length; ii++)
        {
            document.getElementById(graph_canvases[ii]).style.display = 'none'; 
        }

        if (document.getElementById('map').checked) //interferometry
        {
          var mask = parseInt(document.getElementById('map_mask').value); 
          //var cutoff = parseFloat(document.getElementById('map_cutoff').value); 
         // if (isNaN(cutoff)) cutoff = 0;
          //h_map.cutoff = cutoff; 
//          v_map.cutoff = cutoff; 
          var reverse = document.getElementById('map_reverse_sign').checked; 
          var h_graphs = new Array(4) 
          var v_graphs = new Array(4) 
 //         console.log(mask); 

          for (var ii = 0; ii < 4; ii++)
          {
//            console.log(mask & (1 << ii)); 
            if (mask & (1<<ii))  
            {
              h_graphs[ii] = P.graphs[2*ii] ;
              v_graphs[ii] = P.graphs[2*ii+1]; 
            }
            else
            {
              h_graphs[ii] = null;
              v_graphs[ii] = null;
            }

          }

          h_map.compute(h_graphs,reverse);
          v_map.compute(v_graphs,reverse);

          h_map.setTitle("HPol (BETA)","azimuth (deg)","elevation (deg)"); 
          v_map.setTitle("VPol (BETA)","azimuth (deg)","elevation (deg)"); 


          if (first_int) 
          {
            first_int = false
          }
          else
          {
            JSROOT.cleanup(int_canvas_h);
            JSROOT.cleanup(int_canvas_v);
          }

          setGraphHistStyle(h_map.hist); 
          setGraphHistStyle(v_map.hist); 

          var int_fn = function(painter) 
          {
                var hist = painter.GetObject().fHistogram; 
                painter.root_pad().fGridx = 1; 
                painter.root_pad().fGridy = 1; 
                var tpainter = painter.FindPainterFor(null,"title"); 
                var pavetext = tpainter.GetObject(); 
                var pal = painter.FindFunction("TPaletteAxis"); 

//                pal.fAxis.fLabelColor = 31; 
                painter.Redraw(); 
//                pavetext.fTextColor = 31; 
                tpainter.Redraw(); 
                JSROOT.redraw(painter.divid, hist, ""); 
 
          }

         // console.log(h_map.hist); 
          JSROOT.draw(int_canvas_h,h_map.hist,  "colz",int_fn); 
          JSROOT.draw(int_canvas_v,v_map.hist,  "colz",int_fn); 
        }
        else
        {
          if (!first_int); 
          {
            JSROOT.cleanup(int_canvas_h);
            JSROOT.cleanup(int_canvas_v);
          }


        }


        if (document.getElementById('evt_fft').checked) 
        {

          var c = fft_canvas;
          document.getElementById(c).style.display = 'block'; 
          if (P.multigraphs.length) JSROOT.cleanup(c); 


          var mg = JSROOT.CreateTMultiGraph.apply(0, the_ffts); 
          P.multigraphs[0] = mg; 
          mg.fName="power"; 
          mg.fTitle = "Power Spectra" ; 
          if (navg > 0) mg.fTitle += " (" + navg + "avgs)"; 
          var histo = JSROOT.CreateHistogram("TH1I",100); 
          histo.fName = mg.fName + "_h";
          histo.fTitle = mg.fTitle;
          histo.fXaxis.fXmin = 0;
          histo.fXaxis.fXmax = 0.25; 
          histo.fYaxis.fXmin = -30;
          histo.fYaxis.fXmax = 60;
          histo.fMinimum = -30;
          histo.fMaximum = 60;
          histo.fXaxis.fTitle = "f (GHz)"; 
          histo.fYaxis.fTitle = "db ish"; 
          setGraphHistStyle(histo); 
          mg.fHistogram = histo; 
          dl_link.setAttribute("href",encodeURI(csvContent)); 
 
          JSROOT.draw(c, mg, "ALP", function (painter) 
          {


                var leg = makeLegend(0.6,1,0.75,1,the_ffts); 
                var tpainter = painter.FindPainterFor(null,"title"); 
                var pavetext = tpainter.GetObject(); 
//                pavetext.fTextColor = 31; 
                tpainter.Redraw(); 

   
                JSROOT.draw(painter.divid,leg);
                P.legends[0] = leg; 
           }); 
         }
        else
        {
          document.getElementById(fft_canvas).style.display = 'none'; 
        }
      }

      var args = { numentries: 1, firstentry : i} ;
      tree.Process(sel, args); 
    }; 

    checkModTime(event_file, function(time)
    {
          if (last_ev_tree && time == last_ev_modified) 
          {
            ev_proc(last_ev_tree); 
          }
          else
          {
            last_ev_modified=time; 
            JSROOT.OpenFile(event_file, function(file)  
            {
              if (file == null) 
              { 
                alert("Could not open event file!"); 
                return; 
              }

              file.ReadObject("event", ev_proc); 

            }); 
          }

    });





}

function previous() 
{
  var i =parseInt(document.getElementById('evt_entry').value); 
  if (i > 0) i--; 
  go(i); 
}

function next() 
{
  var i =parseInt(document.getElementById('evt_entry').value); 
  go(i+1); 
}

var playing = false; 

function pause()
{

  document.getElementById('play_button').disabled = false; 
  document.getElementById('pause_button').disabled = true; 
  playing = false; 
}


function start()
{
  document.getElementById('play_button').disabled = true; 
  document.getElementById('pause_button').disabled = false; 
  playing = true; 
  next(); 
  setTimeout(function() { if (playing) { start(); } } , document.getElementById('play_speed').value); 
}


function evt() 
{
  optAppend("Run: <input id='evt_run' size=5> "); 
  optAppend("Entry: <input id='evt_entry' value='0' size=10 onchange='go(-1)'> "); 
  optAppend(" | <input type='button' value='&#x22A2;' onClick='go(0)' title='Go to first event'>"); 
  optAppend("<input type='button' value='&larr;' onClick='previous()' title='Previous event'>"); 
  optAppend("<input type='button' id='pause_button' value='&#x25a0;' onClick='pause()' disabled title='Pause playing'>"); 
  optAppend("<input type='button' id='play_button' value='&#x25b6;' onClick='start()' title='Play through events'>"); 
  optAppend("<input type='button' value='&rarr;' onClick='next()' title='Next event'>"); 
  optAppend("<input type='button' value='&#x22A3;' onClick='go(100000000)' title='Last event'>"); 
  optAppend(" &Delta;t<sub>&#x25b6;</sub>:<input type='range' class='slider'  value='500' min='50' max='5000' id='play_speed'  title='Play speed' >"); 
  optAppend(" | Z: <input type='range' value='64' min='4' max='84' id='evt_zoom' class='slider' title='Manual scale'  onchange='go(-1)'> "); 
  optAppend(" auto<input type='checkbox' id='evt_autoscale' onchange='go(-1)'>"); 
  optAppend(" | spec?<input type='checkbox' id='evt_fft' checked title='Compute power spectrum (necessary for upsampling)' onchange='go(-1)'>");
  optAppend("avg?<input type='checkbox' id='avg_fft' title='Check to average fft's (uncheck to reset)' onchange='go(-1)'>");
  optAppend(" Up<input type='range' value='1' min='1' max ='8' class='slider'   id='upsample' onchange='go(-1)' title='upsample factor'>"); 
  optAppend(" | env?<input type='checkbox' id='evt_hilbert' title='Compute Hilbert Envelope (requires spectrum))' onchange='go(-1)'>");
  optAppend(" | meas?<input type='checkbox' id='evt_measure' title='Perform measurements' onchange='go(-1)'>");
  optAppend(" | filt?<input type='checkbox' id='filt' title='Apply filter' onchange='go(-1)'> b:<input id='filt_B' size=15 title='Filter B coeffs (Comma separated)' value='1,6,15,20,15,6,1'> a:<input id='filt_A' title='Filter A coeffs (Comma separated)' size=15 value='64'>"); 
  optAppend(" | map?<input type='checkbox' checked id='map' title='Do interferometric map' onchange='go(-1)'> msk: <input id='map_mask' onchange='go(-1)' value='15' size=2> -dt? <input type='checkbox' id='map_reverse_sign' title='this controls the sign of dt' onchange='go(-1)'>");
//  optAppend(" cutoff: <input id='map_cutoff' title='frequency cutoff for cross-correlations' size=5 value='0'>"); 


  var hash_params = hashParams('event'); 
  document.getElementById('evt_run').value = hash_params['run']===undefined ? runs[runs.length-1]: hash_params['run']; 
  document.getElementById('evt_entry').value = hash_params['entry']===undefined ? '0' : hash_params['entry']; 
  go(-1); 
}



function stat()
{

  optAppend("Start Run: <input id='status_start_run' size=10> ");
  optAppend("Stop Run: <input id='status_end_run' size=10> " ); 
  optAppend("Cut: <input id='status_cut' size=20 value=''>");
  optAppend(" | Full xfers(<a href='javascript:transferHelp()'>?</a>) : <input type=checkbox id='status_full_transfers' checked>  | Use decimated files<input type=checkbox id='status_use_decimated' checked><br>"); 
  optAppend("Plot(<a href='javascript:plotHelp()'><u>?</u></a>):<br>");

  var global_scalers= "status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[2]";
  global_scalers += "|||status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[1]/10";
  global_scalers += "|||status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[0]/10";
  global_scalers += ";;;xtitle:time;title:Global Scalers;ytitle:Hz;xtime:1;labels:Fast,Slow Gated,Slow"

  var beam_scalers = ""; 
  for (var i = 0; i <20 ; i++)
  {
    if (i > 0) beam_scalers+="|||"; 
    beam_scalers+="status.readout_time+status.readout_time_ns*1e-9:status.beam_scalers[0]["+i+"]/10."; 
  }
  beam_scalers+=";;;xtitle:time;title:Beam Scalers;ytitle:Hz;xtime:1;labels:"; 
  for (var i = 0; i <20; i++)
  {
    if (i > 0) beam_scalers+=","; 
    beam_scalers+="Beam "+i; 
  }

  var beam_thresholds = ""; 
  for (var i = 0; i <20; i++)
  {
    if (i > 0) beam_thresholds+="|||"; 
    beam_thresholds+="status.readout_time+status.readout_time_ns*1e-9:status.trigger_thresholds["+i+"]"; 
  }
  beam_thresholds+=";;;xtitle:time;title:Trigger thresholds;ytitle:Power Sum(arb);xtime:1;labels:"; 
  for (var i = 0; i <20; i++)
  {
    if (i > 0) beam_thresholds+=","; 
    beam_thresholds+="Beam "+i; 
  }

  optAppend("<textarea id='plot_status' cols=160 rows=5>"+global_scalers+"\n"+beam_scalers+"\n"+beam_thresholds+"</textarea>");
  optAppend("<br><input type='button' onClick='return statusTreeDraw()' value='Draw'>"); 

  var hash_params = hashParams('status'); 
  document.getElementById('status_start_run').value =  hash_params['run0'] === undefined ? runs[Math.max(0,runs.length-8)] : parseInt(hash_params['run0']); 
  document.getElementById('status_end_run').value =  hash_params['run1'] === undefined ? runs[runs.length-1] : parseInt(hash_params['run1']); 

  statusTreeDraw(); 
}



function show(what) 
{
  playing = false; 

  optClear(); 

  for (var key in pages)
  { 
    document.getElementById(pages[key].main_canvas).style.display = (key === what ? 'block' : 'none');
  }

//  console.log("show('" + what + "')"); 
  if (what in pages)
    clearCanvases(pages[what]); 


  if (what == 'hk') 
  {
    hk(); 
  }
  else if (what == 'status') 
  {
    stat(); 
  }
  else if (what == 'event') 
  {
    evt(); 
  }
  else
  {
    optAppend("Not implemented yet");  
  }
}


function monutau_load()
{



  JSROOT.gStyle.fTitleX=0.1; 
  JSROOT.gStyle.fFrameFillColor=12; 
  JSROOT.gStyle.fFrameLineColor=11; 
  JSROOT.gStyle.fTitleColor=3; 
  JSROOT.gStyle.fGridColor=11; 
  JSROOT.gStyle.fGridColor=11; 
  JSROOT.gStyle.Palette = 87; 
  JSROOT.gStyle.AutoStat=false; 
  JSROOT.gStyle.fNumberContours=255; 

  pages['hk'] = Page('hk'); 
  pages['status'] = Page('status'); 
  pages['event'] = Page('event'); 

  document.getElementById('last_updated').innerHTML = last_updated; 

  var hash = window.location.hash; 
  if (hash == '')
  {
    show('hk'); 
  }
  else 
  {
    show(hash.substring(1).split('&')[0]); 
  }
  setInterval(updateRunlist, 10e3); 
}

