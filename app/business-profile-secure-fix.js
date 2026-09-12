(()=>{
  const SUPABASE_URL='https://nynssdxfmjfqgodgynnu.supabase.co';
  const KEY='sb_publishable_ose18MeKd0ZPfTM1tbq2fg_hzfVcTxf';
  const client=window.supabase?.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:false,detectSessionInUrl:false}});
  if(!client)return;

  let busy=false;

  async function getCompanyId(){
    const selected=document.querySelector('#company')?.value||null;
    if(selected)return selected;
    const {data:{user}}=await client.auth.getUser();
    if(!user)return null;
    const {data}=await client.from('company_members')
      .select('company_id')
      .eq('user_id',user.id).eq('active',true)
      .order('created_at',{ascending:true}).limit(1).maybeSingle();
    return data?.company_id||null;
  }

  async function hydrate(){
    const sheet=document.querySelector('.tos-profile-sheet');
    const form=sheet?.querySelector('.tos-profile-form');
    if(!sheet||!form||sheet.dataset.secureProfileHydrated==='1'||busy)return;
    busy=true;
    try{
      const companyId=await getCompanyId();
      if(!companyId||!sheet.isConnected)return;
      const {data,error}=await client.rpc('get_company_document_profile',{target_company:companyId});
      if(error||!data||!sheet.isConnected)return;
      const values={
        accountName:data.bank_account_name||'',
        sortCode:data.bank_sort_code||'',
        accountNumber:data.bank_account_number||''
      };
      Object.entries(values).forEach(([name,value])=>{
        const input=form.elements.namedItem(name);
        if(input && !input.matches(':focus'))input.value=value;
      });
      sheet.dataset.secureProfileHydrated='1';
    }finally{busy=false;}
  }

  new MutationObserver(()=>hydrate().catch(()=>{})).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>hydrate().catch(()=>{}),{once:true});
  else hydrate().catch(()=>{});
})();
