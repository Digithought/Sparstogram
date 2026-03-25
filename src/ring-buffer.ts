/** Fixed-capacity ring buffer with O(1) push, shift, and indexed access. */
export class RingBuffer<T> {
	private _buffer: T[];
	private _head = 0;
	private _count = 0;

	constructor(private _capacity: number) {
		this._buffer = new Array<T>(_capacity);
	}

	get length(): number { return this._count; }

	push(item: T): void {
		this._buffer[(this._head + this._count) % this._capacity] = item;
		this._count++;
	}

	shift(): T {
		const item = this._buffer[this._head];
		this._head = (this._head + 1) % this._capacity;
		this._count--;
		return item;
	}

	at(index: number): T {
		return this._buffer[
			(this._head + (index < 0 ? index + this._count : index))
				% this._capacity
		];
	}

	reduce<U>(fn: (acc: U, item: T) => U, initial: U): U {
		let acc = initial;
		for (let i = 0; i < this._count; i++) {
			acc = fn(acc, this._buffer[(this._head + i) % this._capacity]);
		}
		return acc;
	}
}
