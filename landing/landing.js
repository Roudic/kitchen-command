(function(){
  var C = window.LANDING || {}, P = C.prices || {};

  // prices + pilot length from config.js
  document.querySelectorAll("[data-price]").forEach(function(el){ var v=P[el.getAttribute("data-price")]; if(v!=null) el.textContent="$"+v; });
  document.querySelectorAll("[data-pilot]").forEach(function(el){ el.textContent=P.pilotDays||30; });
  document.querySelectorAll("[data-app]").forEach(function(el){ el.href=C.appUrl||"../"; });

  // live forecast chart (sample day) — bars colored by crew band, white line = forecast
  var chart=document.getElementById("demo-chart");
  if(chart){
    var BANDS=[{n:"Slow",min:0,c:"#3A3F45",crew:3},{n:"Steady",min:250,c:"#5E656E",crew:4},{n:"Busy",min:450,c:"#A07A22",crew:5},{n:"Rush",min:700,c:"#C8552E",crew:6},{n:"Peak",min:950,c:"#E51636",crew:7}];
    // 6:30a–10p in 15-min slots
    var start=6.5, slots=62, vals=[];
    function bump(t,c,w,h){return h*Math.exp(-Math.pow((t-c)/w,2));}
    for(var i=0;i<slots;i++){var t=start+i/4;vals.push(Math.round(120+bump(t,8,1,380)+bump(t,12.4,.9,880)+bump(t,15,1.2,180)+bump(t,18.2,1,700)+((i*37)%9)*9));}
    var W=620,H=200,pad=24,bw=(W-pad)/slots,max=1100;
    function band(v){var b=BANDS[0];BANDS.forEach(function(x){if(v>=x.min)b=x;});return b;}
    var s='<svg viewBox="0 0 '+W+' '+(H+18)+'" role="img" aria-label="Sample forecast: breakfast, lunch and dinner rushes in 15-minute sales">';
    [250,500,750,1000].forEach(function(g){var y=H-g/max*H;s+='<line x1="'+pad+'" x2="'+W+'" y1="'+y+'" y2="'+y+'" stroke="#2A2E33" stroke-width="1"/><text x="0" y="'+(y+3)+'" fill="#5E656E" font-size="9" font-weight="700">$'+g+'</text>';});
    var line="";
    vals.forEach(function(v,i){var h=v/max*H,x=pad+i*bw;s+='<rect x="'+(x+1)+'" y="'+(H-h)+'" width="'+(bw-2)+'" height="'+h+'" rx="2" fill="'+band(v).c+'" style="animation:none"><title>'+v+'</title></rect>';line+=(i?"L":"M")+(x+bw/2)+" "+(H-v*0.96/max*H);});
    s+='<path d="'+line+'" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.6"/>';
    var nowX=pad+22*bw; s+='<line x1="'+nowX+'" x2="'+nowX+'" y1="0" y2="'+H+'" stroke="#E51636" stroke-width="2" stroke-dasharray="4 3"/><text x="'+(nowX+4)+'" y="10" fill="#ff6b80" font-size="10" font-weight="900">NOW</text>';
    ["7a","9a","11a","1p","3p","5p","7p","9p"].forEach(function(l,k){var x=pad+(2+k*8)*bw;s+='<text x="'+x+'" y="'+(H+14)+'" fill="#5E656E" font-size="9" font-weight="700">'+l+'</text>';});
    chart.innerHTML=s+'</svg>';
    var lg=document.getElementById("demo-legend");
    if(lg) lg.innerHTML=BANDS.map(function(b){return '<span><i style="background:'+b.c+'"></i>'+b.n+' → '+b.crew+' BOH</span>';}).join("");
  }

  // live rush countdown in the demo
  var rb=document.getElementById("demo-rush");
  if(rb){
    var m=38;
    function paint(){ rb.querySelector(".big").textContent= m>0 ? "Lunch rush in "+m+"m" : "LUNCH RUSH NOW"; rb.classList.toggle("hot",m<=0); rb.querySelector(".small").textContent= m>0 ? "Starts 11:00 AM · target 6 BOH · you have 4 on" : "Until 1:30 PM · $940/15 at peak · target 6 BOH"; }
    paint(); setInterval(function(){ m = m<=-6 ? 38 : m-1; paint(); }, 900);
  }

  // scroll reveal
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);}});},{threshold:.12});
    document.querySelectorAll(".reveal").forEach(function(el){io.observe(el);});
  } else document.querySelectorAll(".reveal").forEach(function(el){el.classList.add("in");});

  // pilot request form → email
  var f=document.getElementById("pilot-form");
  if(f) f.addEventListener("submit",function(ev){
    ev.preventDefault();
    var d=new FormData(f), msg=document.getElementById("form-msg");
    var product=f.getAttribute("data-product")||"Kitchen Command";
    if(!C.email){ msg.textContent="Thanks, "+(d.get("name")||"chef")+"! Online requests open soon — ask us in person to start your pilot."; return; }
    var body="Name: "+d.get("name")+"\nStore: "+d.get("store")+"\nRole: "+d.get("role")+"\nPhone/Email: "+d.get("contact")+"\nInterested in: "+product;
    location.href="mailto:"+C.email+"?subject="+encodeURIComponent(product+" pilot — "+d.get("store"))+"&body="+encodeURIComponent(body);
    msg.textContent="Opening your email app… hit send and we'll reach out within a day.";
  });

  var y=document.getElementById("yr"); if(y) y.textContent=new Date().getFullYear();
})();
