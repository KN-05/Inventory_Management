// src/api/onboarding.js - plans, onboarding steps and subscription status
import axiosInstance from './axiosInstance';

export const getPlans = () => axiosInstance.get('/plans').then((res) => res.data);

export const getOnboarding = () => axiosInstance.get('/onboarding').then((res) => res.data);

export const saveBusinessDetails = (details) =>
  axiosInstance.put('/onboarding/details', details).then((res) => res.data);

export const savePlanChoice = (planId, billingCycle) =>
  axiosInstance.put('/onboarding/plan', { planId, billingCycle }).then((res) => res.data);

export const completeOnboarding = () => axiosInstance.post('/onboarding/complete').then((res) => res.data);

export const getSubscription = () => axiosInstance.get('/subscription').then((res) => res.data);
