import { EventEmitter } from 'events';

export const eventEmitter = new EventEmitter();

export const EVENTS = {
  ORDER_CREATED: 'ORDER_CREATED',
  STOCK_LOW: 'STOCK_LOW'
};
