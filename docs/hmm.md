change to doc where changed doc doesn't match existing query.
meteor handled this by keeping in memory what the client had, i think.  doesn't scale well.
fair trade off to not support this case?

login sessions, could have sid removed from sessions array
need to see how mongo handles array changes,
can we do a json patch and look if our query is affected?
