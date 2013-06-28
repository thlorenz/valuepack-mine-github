'use strict';

function findLatestLastModied(pages) {
  var latest = null, lm;
  for (var i = 0; i < pages.length; i++) {
    lm = pages[i].headers.lastModified;
    if (!latest || (lm && latest < lm))
      latest = lm;
  }
  return latest;
}

module.exports = function (pages) {
  if (!pages || !pages.length) return [];

  var last = pages[pages.length - 1]  
    , body;

  // if all statusCodes were 304 (meaning no page changed)
  var modified = !pages
    .some(function (page) {
      return page.statusCode === 304;  
    });

  // if some but not all pages where modified we have to deal with that upstream
  var prevCode = null;
  var mixedModifieds = pages
    .some(function (page) {
      if (!prevCode) {
        prevCode = page.statusCode;
        return false;
      }
      return page.statusCode !== prevCode;
    })

  if (modified && !mixedModifieds) {
    // keep all bodies, but only last headers
    body = pages.reduce(function (acc, page) {
      return acc.concat(page.body);
    }, []);
  } 
  var headers = last.headers;
  headers.lastModified = findLatestLastModied(pages);

  return { 
      headers        :  headers
    , statusCode     :  last.statusCode
    , body           :  body
    , modified       :  modified
    , mixedModifieds :  mixedModifieds
    , aborted        :  !!last.aborted
  };
};
