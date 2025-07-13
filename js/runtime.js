setInterval(() => {
  let create_time = Math.round(new Date('2023-01-12 00:00:00').getTime() / 1000); //在此行修改建站时间
  let timestamp = Math.round((new Date().getTime()) / 1000);
  let second = timestamp - create_time;
  let time = new Array(0, 0, 0, 0, 0);

  var nol = function(h){
    return h>9?h:'0'+h;
  }
  if (second >= 365 * 24 * 3600) {
    time[0] = parseInt(second / (365 * 24 * 3600));
    second %= 365 * 24 * 3600;
  }
  if (second >= 24 * 3600) {
    time[1] = parseInt(second / (24 * 3600));
    second %= 24 * 3600;
  }
  if (second >= 3600) {
    time[2] = nol(parseInt(second / 3600));
    second %= 3600;
  }
  if (second >= 60) {
    time[3] = nol(parseInt(second / 60));
    second %= 60;
  }
  if (second > 0) {
    time[4] = nol(second);
  }
  if ((Number(time[2])<22) && (Number(time[2])>7)){
    currentTimeHtml = "<div id='runtime'><span class='boardsign-text'>🌞 小破站营业中 — </span> " +
                    "已经平稳度过 " + time[0] + " 年 " + time[1] + " 天 " + time[2] + " : " + time[3] + " : " + time[4] +
                    "</div>";
  }
  else{
    currentTimeHtml = "<div id='runtime'><span class='boardsign-text'>🌙 小破站打烊了 — </span> " +
                    "已经平稳度过 " + time[0] + " 年 " + time[1] + " 天 " + time[2] + " : " + time[3] + " : " + time[4] +
                    "</div>";
  }
  document.getElementById("workboard").innerHTML = currentTimeHtml;
}, 1000);
