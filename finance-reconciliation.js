(function(root){
  function reference(person,context){return `${context.venueKey}:${person.id}:${person.paymentSubmittedAt||person.ts||person.registeredAt||context.date}`;}
  function rows(sources,entries,cutoff=0){
    const result=[],seen=new Set();
    for(const source of sources)for(const person of source.people||[]){
      if(['小王','test'].includes(String(person.name).trim().toLowerCase()))continue;
      const status=person.paymentStatus||(person.paid?'received':'unpaid');
      if(!source.current&&status==='unpaid')continue;
      const date=person.paymentEventDate||source.date;
      const ref=reference(person,{venueKey:source.venueKey,date});
      if(seen.has(ref))continue;
      seen.add(ref);
      const receipt=entries.find(row=>row.reference===ref&&row.type==='payment');
      let ledgerState=status;
      if(status==='received')ledgerState=!person.paymentVerifiedAt||!Number(person.paymentAmount)?'legacy':receipt?(root.DoveFinance.active(entries,receipt)?'recorded':'refunded'):Number(person.paymentVerifiedAt)<=cutoff?'reset':'missing';
      result.push({name:person.name,id:person.id,status,ledgerState,reference:ref,venueKey:source.venueKey,date,plan:person.paymentPlan,amount:Number(person.paymentAmount)||null,current:!!source.current});
    }
    return result;
  }
  root.DoveFinanceReconciliation={reference,rows};
})(typeof window!=='undefined'?window:globalThis);
