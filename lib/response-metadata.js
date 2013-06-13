'use strict';

module.exports = function (res) {
  if (!res.headers) return {};
  return { 
    headers: {
        remaining    :  res.headers['x-ratelimit-remaining']
      , etag         :  res.headers['etag']
      , lastModified :  res.headers['last-modified']
      , date         :  res.headers['date']
      }
    , modified       :  res.modified
    , mixedModifieds :  res.mixedModifieds
  };
};
