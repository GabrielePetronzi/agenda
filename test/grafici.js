/* Dati d'esempio per guardare i grafici: il 9 novembre, sette settimane di
   semestre alle spalle e dieci davanti, cinque materie, un po' fatto col
   timer, un po' saltato, qualche spunta a mano. Lascia aperto solo "Come sta
   andando", cosi' la fotografia prende i grafici e basta. Lo usa
   test/grafici.sh per rifare le immagini in bozze/. */
(function(){
  /* l'orologio finto (9 novembre) lo mette test/grafici.sh prima dell'app */
  var rng=(function(x){return function(){x=(x*1103515245+12345)&0x7fffffff;return x/0x7fffffff;};})(7);
  state.cells={};state.pass={};state.log={};state.exams=[];state.pomRun=null;state.ctx="1";
  var mat=items().filter(function(o){return o.kind==="c";}),A=mat[0],B=mat[1],C=mat[2],D=mat[3];
  var lun=monday(new Date());
  var inizio=addDays(lun,-49);
  for(var g=0;g<17*7;g++){
    var d=iso(addDays(inizio,g)),dow=(g%7);           /* 0 = lunedi' */
    var passato=d<iso(new Date());
    var sett=Math.floor(g/7);
    var metti=function(sl,o,a,len){
      placeRun(d,sl,{i:o.id,a:a,len:len},null);
      if(!passato||a==="LEZ")return;
      var p=rng(),bravura=sett<3?0.85:(sett<5?0.6:0.72);
      if(p<bravura)setDoneQuiet(d,sl,at(ck(d,sl)).length-1,1),
        (function(){var arr=at(ck(d,sl));var L=arr.length-1;for(var k=0;k<len;k++){var a2=at(ck(d,sl+k)).slice();if(a2[L]){delete a2[L].m;setAt(ck(d,sl+k),a2);}}})();
      else if(p<bravura+0.06)setDoneQuiet(d,sl,at(ck(d,sl)).length-1,1);   /* il furbo */
    };
    if(dow<5){
      metti(18,dow%2?A:B,"LEZ",4);
      metti(24,A,"SCH",3);
      metti(30,B,"LET",3);
      metti(34,C,"ESE",3);
      if(dow<4)metti(42,D,"RIP",1);
    }else if(dow===5){metti(20,A,"ESE",4);metti(30,C,"SCH",3);}
  }
  autoLessons();
  setDataEsame(A.id,iso(addDays(lun,70)),"09:00");
  setDataEsame(B.id,iso(addDays(lun,84)),"09:00");
  state.semOpen=true;state.anchor[state.ctx]=iso(lun);
  render();semSummary();
  /* solo i grafici: via la griglia e le barre, la colonna delle materie resta */
  ["pombar"].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display="none";});
  var el=document.getElementById("semSum");
  [].forEach.call(el.parentElement.children,function(s){if(s!==el)s.style.display="none";});
  document.querySelectorAll(".topbar").forEach(function(e){e.style.display="none";});
  el.style.marginTop="0";el.style.borderTop="0";
  document.title="GRAFICI PRONTI";
})();
