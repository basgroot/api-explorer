
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
  l.href = target;
  l.text = title;
  return l;
}

function getLineBreak() {
  let b = document.createElement('br');
  return b;
}

function getUrl(method, endpoint) {
  let url = "index.html?method=" + method + "&endpoint=" + encodeURIComponent(endpoint);
  return url;
}

fetch("https://basgroot.github.io/api-explorer/config/navigation_new.json").then(r => r.json()).then(navigation => {
  let d = document.getElementById("left-nav-content");
  for (let tagName in navigation) {
    if (tagName != "Tag") {
      var tag = createTag(tagName)
      var links = getLinkWrapper();
      for (let i in navigation[tagName]) {
        let title = navigation[tagName][i].title;
        let method =  navigation[tagName][i].method;
        let endpoint =  navigation[tagName][i].endpoint;
        let url = getUrl(method, endpoint);
        let link = createLink(title, url)
        links.appendChild(link);
        links.appendChild(getLineBreak());
      }
      d.appendChild(tag);
      d.appendChild(links)
  }
    }
    
  var coll = document.getElementsByClassName("collapsible");
  var i;

  for (i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function() {
      this.classList.toggle("active");
      var content = this.nextElementSibling;
      if (content.style.maxHeight){
        content.style.maxHeight = null;
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
      } 
    });
  }
})


