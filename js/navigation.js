var coll = document.getElementsByClassName("left-nav-collapsible");
var i;

function createTag(name) {
  let b = document.createElement('button');
  b.className = "left-nav-collapsible";
  b.innerText = name;
  return b;
}

function createLink(title, url) {
  let d = document.createElement('div');
  d.className = "content"

  d.innerHTML = "<p>x</p>"

  return d;
}

fetch("https://basgroot.github.io/api-explorer/config/navigation.json").then(r => r.json()).then(navigation => {
  //console.log(navigation);

  let d = document.getElementById("left-nav-content");
  
  for (let tagName in navigation) {
    //console.log(tagName)

    var tag = createTag(tagName)

    for (let title in navigation[tagName]) {
      //console.log(title)
      let url = navigation[tagName][title]
      //console.log(endpoint)

      let link = createLink(title, url)
      tag.appendChild(link);
    }
  }

  d.appendChild(tag);


})

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