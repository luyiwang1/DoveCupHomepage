(function(root){
  const levelOf = person => root.DoveTourLevels.normalize(person.levelGroup);
  function canJoin(state, venue, level) {
    if (state.joined.length >= Math.min(state.capacity || venue.capacity, venue.capacity)) return false;
    return !venue.levelCapacity || state.joined.filter(p=>levelOf(p) === root.DoveTourLevels.normalize(level)).length < venue.levelCapacity;
  }
  function rebalance(state, venue) {
    const next={...state,joined:[],waitlist:[]},overflow=[];
    for(const person of state.joined || []) {
      const copy={...person,levelGroup:levelOf(person)};
      if(canJoin(next,venue,copy.levelGroup)) next.joined.push(copy); else overflow.push(copy);
    }
    next.waitlist=[...overflow,...(state.waitlist || []).map(p=>({...p,levelGroup:levelOf(p)}))];
    return next;
  }
  root.DoveSignupCapacity={canJoin,rebalance};
})(typeof window!=='undefined'?window:globalThis);
