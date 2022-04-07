var coll = document.getElementsByClassName("left-nav-collapsible");
var i;

console.log("test test test");

for (i = 0; i < coll.length; i++) {
  coll[i].addEventListener("click", function() {
    console.log("click lick");
    this.classList.toggle("active");
    var content = this.nextElementSibling;
    if (content.style.maxHeight){
      content.style.maxHeight = null;
    } else {
      content.style.maxHeight = content.scrollHeight + "px";
    } 
  });
}