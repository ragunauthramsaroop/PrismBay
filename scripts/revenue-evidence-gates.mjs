// Strictly separate technical checks from commercial proof.
export function classifyRevenueEvidence({guideHealthy=false,checkoutHealthy=false,trafficCount=null,paidOrders=null,deliveredOrders=null}={}){
  const technicalPathHealthy=Boolean(guideHealthy&&checkoutHealthy);
  const trafficStatus=trafficCount===null?'UNMEASURED':trafficCount===0?'NO_RECORDED_TRAFFIC':'MEASURED';
  const paymentStatus=paidOrders===null?'STRIPE_DATA_NOT_CONNECTED':paidOrders===0?'NO_PAID_ORDERS':'PAYMENTS_RECORDED';
  const deliveryStatus=deliveredOrders===null?'NOT_VERIFIED':deliveredOrders===0?'NO_DELIVERIES_RECORDED':'DELIVERIES_RECORDED';
  const revenueVerified=Number.isInteger(paidOrders)&&paidOrders>0;
  const firstSaleVerified=revenueVerified;
  const nextAction=!technicalPathHealthy?'REPAIR_BUYER_LINKS':
    trafficCount===null?'MEASURE_EXTERNAL_BUYER_TRAFFIC':
    trafficCount===0?'DISTRIBUTE_TO_RELEVANT_BUYERS':
    paidOrders===null?'VERIFY_PAID_STRIPE_EVENTS':
    paidOrders===0?'IMPROVE_OFFER_CONVERSION':
    deliveredOrders===null?'VERIFY_ORDER_BOUND_FULFILLMENT':'MEASURE_MARGIN_AND_REFUNDS';
  return {technicalPathHealthy,trafficStatus,paymentStatus,deliveryStatus,revenueVerified,firstSaleVerified,nextAction,
    note:'GitHub link checks and generated content are not evidence of buyers, actual Stripe payments or delivered orders.'};
}
