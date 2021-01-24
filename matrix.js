class Matrix {
    constructor(width, height, element = (x, y) => undefined) {
      this.width = width;
      this.height = height;
      this.content = [];
  
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          this.content[y * width + x] = element(x, y);
        }
      }
    }
  
    get(x, y) {
      return this.content[y * this.width + x];
    }
    set(x, y, value) {
      this.content[y * this.width + x] = value;
    }

    [Symbol.iterator] = function() {
        return new MatrixIterator(this);
    }
  }

class MatrixIterator {
    constructor(matrix) {
        this.x = 0;
        this.y = 0;
        this.matrix = matrix;
    }

    next() {
        if (this.y == this.matrix.height) return {done: true};

        // Create return object
        // MUST BE called value, the for/of loop will actually not give the full object this method returns
        // strictly it returns the value property of the thing this method returns.
        // Ex if I return res: {}, done: true then the for/of loop will return undefined since there
        // is no value property
        let value = {
            x: this.x,
            y: this.y,
            value: this.matrix.get(this.x, this.y)
        }

        // increment x, if equal to width then reset to 0 and increment y
        this.x++
        if (this.x == this.matrix.width) {
            this.x = 0;
            this.y++;
        }
        return {value, done: false};
        }
    }

class SymmetricMatrix extends Matrix {
    constructor(size, element = (x, y) => undefined) {
        super(size, size, (x, y) => {
            if (x<y) return element(y,x);
            else return element(x,y);
        });
    }
    
    set(x, y, value) {
        super.set(x, y, value);
        if (x != y) return super.set(y,x,value);
    }
}