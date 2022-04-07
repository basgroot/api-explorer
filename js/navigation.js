
function createTag(name) {
  let b = document.createElement('button');
  b.className = "collapsible";
  b.innerText = name;
  return b;
}

function getLinkWrapper() {
  let d = document.createElement('div');
  d.className = "content";
  return d;
}

function createLink(title, target) {
  let l = document.createElement('a');
  l.target = target;
  l.title = title;
  return l;
}

fetch("https://basgroot.github.io/api-explorer/config/navigation.json").then(r => r.json()).then(navigation => {
  let d = document.getElementById("left-nav-content");
  for (let tagName in navigation) {
    var tag = createTag(tagName)
    var links = getLinkWrapper();
    for (let title in navigation[tagName]) {
      let url = navigation[tagName][title]
      let link = createLink(title, url)
      links.appendChild(link);
    }
    d.appendChild(tag);
    d.appendChild(links)
  }
  var coll = document.getElementsByClassName("collapsible");
  var i;

  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    });
  }
})


