import { Order } from './order';
import { Price } from './price';
import { Component, OnInit, Input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconRegistry } from '@angular/material';
import { TdMediaService } from '@covalent/core';

import { TdDataTableService, TdDataTableSortingOrder, ITdDataTableSortChangeEvent, ITdDataTableColumn } from '@covalent/core/data-table';
import { IPageChangeEvent } from '@covalent/core/paging';
import * as ccxt from 'ccxt';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import { ExchangeInfo } from '../../exchanges/exchange-info';
import { Market } from 'ccxt';
import { MarketValues } from '../../market/display-market/market-values';
import {FormBuilder, FormGroup} from '@angular/forms';
import { LocalStorageService } from 'ngx-webstorage';

export enum OrderBy {
  ASC = <any>'asc',
  DESC = <any>'desc',
}

export interface IHeaders {
  [key: string]: OrderBy;
}
const DECIMAL_FORMAT: (v: any) => any = (v: number) => v.toFixed(4);

@Component({
  selector: 'RCE-my-order',
  templateUrl: './my-order.component.html',
  styleUrls: ['./my-order.component.scss']
})
export class MyOrderComponent implements OnInit {
  [x: string]: any;
  sellPrice: any;
  buyQty: any;
  buyPrice: any;
  sellQty: any;
  sortByAsk = 'price';
  sortByBid = 'price';
  filteredDataBidTotal: number;
  filteredDataAskTotal: number;
  filteredDataAsk: any[];
  filteredDataBid: any[];
  dataAsk: any[] = [];
  dataBid: any[] = [];
  selectedExchange = '';
  selectedSymbol = '';
  selectedCurrency = '';
  data: any;
  filteredData: any[];
  exchanges = ccxt.exchanges;
  filteredBuyOrders: any[];
  filteredSellOrders: any[];
  sortByOrder = 'total';
  filteredBuyOrdersTotal = 0;
  filteredSellOrdersTotal = 0;

  proxy = 'https://cors-anywhere.herokuapp.com/';
  bidColumns: ITdDataTableColumn[] = [
    { name: 'price', label: 'Price', sortable: true, filter: true, width: 200 },
    { name: 'amount', label: 'Quantity', sortable: true, filter: true }
  ];
  asksColumns: ITdDataTableColumn[] = [
    { name: 'price', label: 'Price', sortable: true, filter: true, width: 200 },
    { name: 'amount', label: 'Quantity', sortable: true, filter: true }
  ];
  columns: ITdDataTableColumn[] = [
    { name: 'symbol', label: 'Symbol', sortable: true, filter: true, width: 150 },
    { name: 'marketName', label: 'Market', sortable: true, filter: true, width: 150 },
    { name: 'marketCurrencyLong', label: 'Currency', filter: true, sortable: true },
    { name: 'volume', label: 'Volume', filter: true, sortable: true, width: 150 },
    { name: 'bid', label: 'Bid', width: 100 },
    { name: 'ask', label: 'Ask',  width: 100 },
    { name: 'high', label: 'high', width: 100 },
    { name: 'low', label: 'low', width: 100 }
  ];
  orderColumns: ITdDataTableColumn[] = [
    { name: 'orderId', label: 'Order Id', sortable: true, filter: true, width: 150 },
    { name: 'exchange', label: 'Exchange', sortable: true, filter: true, width: 150 },
    { name: 'market', label: 'Symbol', filter: true, sortable: true },
    { name: 'currency', label: 'Currency', filter: true, sortable: true, width: 150 },
    { name: 'price', label: 'Price', width: 100 },
    { name: 'volume', label: 'Volume',  width: 100 },
    { name: 'total', label: 'Total', width: 150, format: DECIMAL_FORMAT },
  ];

  //filteredData: ExchangeInfo[] = this.data;
  filteredTotal: number;
  clickable = true;
  selectable = true;
  searchTerm: string = '';
  fromRow: number = 1;
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeMarket: number = 50;
  sortBy: string = 'volume';
  selectedRows: any[] = [];
  ex: any;
  sortOrder: TdDataTableSortingOrder = TdDataTableSortingOrder.Descending;
  exSelected = 'bittrex';
  marketValues: MarketValues[] = [];
  typeSelected = 'limit';
  @Input() marketId: string;

  sellOrders: Order[] = [];
  buyOrders: Order[] = [];
  constructor(private _dataTableService: TdDataTableService,
    private storage: LocalStorageService) { 
      this.storage.store('pageTitle', 'Order');
    }

  ngOnInit() {

    // let ex = new ccxt.kraken();
    //ex.proxy = 'https://crossorigin.me/';
    // ex.proxy = 'https://localhost:8081/';
    // console.log(ex.loadMarkets());
    this.loadSelectedMarket(this.exSelected);
  }
 human_value = function (price) {
    return typeof price === 'undefined' ? 'N/A' : price;
};
  fetchTickers(exchange: any, market: Market, symbol: any) {
    try {
      exchange.timeout = 30000;
      const ticker = Observable.from(exchange.fetchTicker(symbol));
      ticker.subscribe ( t => {
        this.marketValues.push({
          symbol: symbol,
          high: this.human_value (t['high']),
          low: this.human_value (t['low']),
          bid: this.human_value (t['bid']),
          ask: this.human_value (t['ask']),
          volume: this.human_value (t['quoteVolume']),
          timeStamp:  t['datetime'],
          marketCurrency: market.info['MarketCurrency'],
          marketName: market.info['MarketName'],
          marketCurrencyLong: market.info['MarketCurrencyLong']
      });
    } ,
      (error) => console.log(error),
      () => {
        this.data = this.marketValues;
        this.filter();
      });
  } catch (error) {

  }
}


  loadSelectedMarket(selectedExchange) {
    try {
      this.selectedExchange = selectedExchange;
      this.selectedExchange = this.selectedExchange.toUpperCase();
     this.ex = new ccxt[selectedExchange]({ 'proxy': this.proxy });
     this.ex.timeout = 30000;
      const markets = Observable.from(this.ex.loadMarkets());
      markets.subscribe( m => {
        Object.values(m).forEach( v => {
          this.fetchTickers(this.ex, v, v.symbol);
      });
    });
    } catch (error) {
      console.log (error);
    }
  }


  sort(sortEvent: ITdDataTableSortChangeEvent): void {
    this.sortBy = sortEvent.name;
    this.sortOrder = sortEvent.order;
    this.filter();
  }

  search(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.filter();
  }

  page(pagingEvent: IPageChangeEvent): void {
    this.fromRow = pagingEvent.fromRow;
    this.currentPage = pagingEvent.page;
    this.pageSize = pagingEvent.pageSize;
    this.filter();
  }
  filteredBuyOrderPage(pagingEvent: IPageChangeEvent): void {
    this.fromRow = pagingEvent.fromRow;
    this.currentPage = pagingEvent.page;
    this.pageSize = pagingEvent.pageSize;
    this.filterBuyOrder();
  }
  filteredSellOrderPage(pagingEvent: IPageChangeEvent): void {
    this.fromRow = pagingEvent.fromRow;
    this.currentPage = pagingEvent.page;
    this.pageSize = pagingEvent.pageSize;
    this.filterSellOrder();
  }
  showAlert(event: any): void {
    let row: any = event.row;
    // .. do something with event.row
  }

  filter(): void {
    let newData: any[] = this.data;
    const excludedColumns: string[] = this.columns
    .filter((column: ITdDataTableColumn) => {
      return ((column.filter === undefined && column.hidden === true) ||
              (column.filter !== undefined && column.filter === false));
    }).map((column: ITdDataTableColumn) => {
      return column.name;
    });
    this.filteredTotal = newData.length;
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, excludedColumns);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    newData = this._dataTableService.pageData(newData, this.fromRow, this.currentPage * this.pageSize);
    this.filteredData = newData;
  }
  filterBid(): void {
    let newData: any[] = this.dataBid;
    const excludedColumns: string[] = this.columns
    .filter((column: ITdDataTableColumn) => {
      return ((column.filter === undefined && column.hidden === true) ||
              (column.filter !== undefined && column.filter === false));
    }).map((column: ITdDataTableColumn) => {
      return column.name;
    });
    this.filteredDataBidTotal = newData.length;
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, excludedColumns);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    newData = this._dataTableService.pageData(newData, this.fromRow, this.currentPage * this.pageSize);
    this.filteredDataBid = newData;
  }
  filterAsk(): void {
    let newData: any[] = this.dataAsk;
    const excludedColumns: string[] = this.columns
    .filter((column: ITdDataTableColumn) => {
      return ((column.filter === undefined && column.hidden === true) ||
              (column.filter !== undefined && column.filter === false));
    }).map((column: ITdDataTableColumn) => {
      return column.name;
    });
    this.filteredDataAskTotal = newData.length;
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, excludedColumns);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    newData = this._dataTableService.pageData(newData, this.fromRow, this.currentPage * this.pageSize);
    this.filteredDataAsk = newData;
  }
  setSelecteSymbol(event: any) {
    this.selectedSymbol = event.row['marketName'];
    this.selectedCurrency = event.row['marketCurrencyLong'];
    this.buyPrice = 0.00;
    this.buyQty = 0.00;
    this.sellPrice = 0.00;
    this.sellQty = 0.00;
    this.buyOrders = this.storage.retrieve('buyOrders');
    this.buyOrders = this.buyOrders.filter( o => o.market === this.selectedSymbol && o.exchange === this.selectedExchange);
    this.filterBuyOrder();
    this.sellOrders = this.storage.retrieve('sellOrders');
    this.sellOrders = this.sellOrders.filter( o => o.market === this.selectedSymbol && o.exchange === this.selectedExchange);
    this.filterSellOrder();
    this.fetchOrderBook(event.row['symbol']);
  }
  fetchOrderBook(symbol: string) {
    const bidPrices: Price[] = [];
    const bidAsks: Price[] = [];
    this.ex.timeout = 30000;
    let bidPrice: Price;
    let askPrice: Price;
    const orderBook = Observable.from(this.ex.fetchOrderBook(symbol));
    orderBook.subscribe ( t => {
              const bid = Observable.of(t['bids']);
              bid.subscribe( b => {
                b.forEach(e => {
                  bidPrice = new Price();
                  bidPrice.price = e[0];
                  bidPrice.amount = e[1];
                  bidPrices.push(bidPrice);
                });
              },
              (err) => console.log(err),
              () => {
                  this.dataBid = bidPrices;
                  this.filterBid();
              });
              const ask = Observable.of(t['asks']);
              ask.subscribe( b => {
                b.forEach(e => {
                  askPrice = new Price();
                  askPrice.price = e[0];
                  askPrice.amount = e[1];
                  bidAsks.push(askPrice);
                });
              },
              (err) => console.log(err),
              () => {
                  this.dataAsk = bidAsks;
                  this.filterAsk();                  
              });
          }
    );
  }
  populateBidPrice($event) {
    this.buyPrice = $event.row['price'];
    this.buyQty = $event.row['amount'];
    this.sellPrice = $event.row['price'];
    this.sellQty = $event.row['amount'];
  }
  populateAskPrice($event) {
    this.sellPrice = $event.row['price'];
    this.sellQty = $event.row['amount'];
    this.buyPrice = $event.row['price'];
    this.buyQty = $event.row['amount'];
  }
  buyCoin() {
    this.buyOrders = this.storage.retrieve('buyOrders');
    if (this.buyOrders === null) {
      this.buyOrders = [];
    }
    const orderIdConst = 'B0000';
    this.buyOrders.push({
        orderId: orderIdConst + (this.buyOrders.length + 1),
        exchange: this.selectedExchange,
        market: this.selectedSymbol,
        currency: this.selectedCurrency,
        price: this.buyPrice,
        volume: this.buyQty,
        total: this.buyPrice * this.buyQty,
        orderType: 'Buy'
    });
    this.storage.store('buyOrders', this.buyOrders);
    this.buyOrders = this.buyOrders.filter( o => o.market === this.selectedSymbol && o.exchange === this.selectedExchange);
    this.filterBuyOrder();
  }
  sellCoin() {
    this.sellOrders = this.storage.retrieve('sellOrders');
    if (this.sellOrders === null) {
      this.sellOrders = [];
    }
    const orderIdConst = 'S0000';
    this.sellOrders.push({
        orderId: orderIdConst + (this.sellOrders.length + 1),
        exchange: this.selectedExchange,
        market: this.selectedSymbol,
        currency: this.selectedCurrency,
        price: this.sellPrice,
        volume: this.sellQty,
        total: this.sellPrice * this.sellQty,
        orderType: 'Sell'
    });
    this.storage.store('sellOrders', this.sellOrders);
    this.sellOrders  = this.sellOrders.filter( o => o.market === this.selectedSymbol && o.exchange === this.selectedExchange);
    this.filterSellOrder();
  }
  filterBuyOrder(): void {
    let newData: any[] = this.buyOrders;
    const excludedColumns: string[] = this.columns
    .filter((column: ITdDataTableColumn) => {
      return ((column.filter === undefined && column.hidden === true) ||
              (column.filter !== undefined && column.filter === false));
    }).map((column: ITdDataTableColumn) => {
      return column.name;
    });
    this.filteredBuyOrdersTotal = newData.length;
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, excludedColumns);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    newData = this._dataTableService.pageData(newData, this.fromRow, this.currentPage * this.pageSize);
    this.filteredBuyOrders = newData;
  }
  filterSellOrder(): void {
    let newData: any[] = this.sellOrders;
    const excludedColumns: string[] = this.columns
    .filter((column: ITdDataTableColumn) => {
      return ((column.filter === undefined && column.hidden === true) ||
              (column.filter !== undefined && column.filter === false));
    }).map((column: ITdDataTableColumn) => {
      return column.name;
    });
    this.filteredSellOrdersTotal = newData.length;
    newData = this._dataTableService.filterData(newData, this.searchTerm, true, excludedColumns);
    newData = this._dataTableService.sortData(newData, this.sortBy, this.sortOrder);
    newData = this._dataTableService.pageData(newData, this.fromRow, this.currentPage * this.pageSize);
    this.filteredSellOrders = newData;
  }
}

