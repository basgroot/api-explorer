
function createTag(name) {
  let b = document.createElement('button');
  b.className = "left-nav-collapsible";
  b.innerText = name;
  return b;
}

function getLinkWrapper() {
  let d = document.createElement('div');
  d.className = "nav-content";
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
    var linkWrapper = getLinkWrapper();
    for (let title in navigation[tagName]) {
      let url = navigation[tagName][title]
      let link = createLink(title, url)
      linkWrapper.appendChild(link);
    }
    tag.appendChild(linkWrapper)
    d.appendChild(tag);
  }
  var coll = document.getElementsByClassName("left-nav-collapsible");
  var i;
  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling.children[0];
      console.log(content.children[0]);
    });
  }
})


