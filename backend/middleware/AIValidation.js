

export const validatePredictPayload = (req, res, next) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid payload: request body must be a single JSON object.'
    });
  }

  
  if (body.current_stock !== undefined) {
    const stock = Number(body.current_stock);
    if (isNaN(stock) || !isFinite(stock)) {
      return res.status(400).json({ status: 'error', message: "Field 'current_stock' must be a valid finite number." });
    }
    if (stock < 0) {
      return res.status(400).json({ status: 'error', message: "Field 'current_stock' cannot be negative." });
    }
  }

  if (body.quantity !== undefined) {
    const qty = Number(body.quantity);
    if (isNaN(qty) || !isFinite(qty)) {
      return res.status(400).json({ status: 'error', message: "Field 'quantity' must be a valid finite number." });
    }
    if (qty < 0) {
      return res.status(400).json({ status: 'error', message: "Field 'quantity' cannot be negative." });
    }
  }

  if (body.movement_type !== undefined) {
    const mtype = String(body.movement_type).toUpperCase();
    if (!['INWARD', 'OUTWARD', 'TRANSFER'].includes(mtype)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid movement_type '${body.movement_type}'. Allowed values: INWARD, OUTWARD, TRANSFER.`
      });
    }
  }

  next();
};

export const validateBatchPayload = (req, res, next) => {
  const body = req.body;

  if (!Array.isArray(body) || body.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid batch payload: request body must be a non-empty array of objects.'
    });
  }

  next();
};
